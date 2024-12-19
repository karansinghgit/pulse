package api

import (
	"net/http"
	"strings"

	"github.com/karansingh/pulse/pkg/models"
)

// TraceContext represents the trace information that can be propagated across services
type TraceContext struct {
	TraceID      string
	SpanID       string
	ParentSpanID string
	Sampled      bool
}

// Constants for header names in different propagation formats
const (
	// W3C Trace Context headers
	W3CTraceParentHeader = "traceparent"
	W3CTraceStateHeader  = "tracestate"

	// Jaeger headers
	JaegerTraceHeader   = "uber-trace-id"
	JaegerBaggagePrefix = "uberctx-"

	// OpenTelemetry headers
	OTelTraceParentHeader = "traceparent"
	OTelTraceStateHeader  = "tracestate"

	// B3 headers (Zipkin)
	B3TraceIDHeader      = "x-b3-traceid"
	B3SpanIDHeader       = "x-b3-spanid"
	B3ParentSpanIDHeader = "x-b3-parentspanid"
	B3SampledHeader      = "x-b3-sampled"
	B3SingleHeader       = "b3"

	// Pulse custom headers
	PulseTraceIDHeader  = "x-pulse-trace-id"
	PulseSpanIDHeader   = "x-pulse-span-id"
	PulseParentIDHeader = "x-pulse-parent-id"
)

// ExtractTraceContext extracts trace context from HTTP headers
// It supports multiple formats including W3C Trace Context, Jaeger, B3, and custom Pulse headers
func ExtractTraceContext(r *http.Request) *TraceContext {
	if r == nil {
		return nil
	}

	// Try W3C Trace Context (used by OpenTelemetry as well)
	if traceCtx := extractW3CTraceContext(r); traceCtx != nil {
		return traceCtx
	}

	// Try B3 format (Zipkin)
	if traceCtx := extractB3TraceContext(r); traceCtx != nil {
		return traceCtx
	}

	// Try Jaeger format
	if traceCtx := extractJaegerTraceContext(r); traceCtx != nil {
		return traceCtx
	}

	// Try Pulse custom headers as a fallback
	if traceCtx := extractPulseTraceContext(r); traceCtx != nil {
		return traceCtx
	}

	return nil
}

// extractW3CTraceContext extracts trace context from W3C Trace Context headers
// Format: traceparent: 00-<trace-id>-<span-id>-<trace-flags>
func extractW3CTraceContext(r *http.Request) *TraceContext {
	traceParent := r.Header.Get(W3CTraceParentHeader)
	if traceParent == "" {
		return nil
	}

	parts := strings.Split(traceParent, "-")
	if len(parts) != 4 {
		return nil
	}

	// version := parts[0]
	traceID := parts[1]
	spanID := parts[2]
	flags := parts[3]

	// Check if valid hex
	if len(traceID) != 32 || len(spanID) != 16 {
		return nil
	}

	sampled := false
	if flags == "01" {
		sampled = true
	}

	return &TraceContext{
		TraceID: traceID,
		SpanID:  spanID,
		Sampled: sampled,
	}
}

// extractB3TraceContext extracts trace context from B3 headers (Zipkin)
func extractB3TraceContext(r *http.Request) *TraceContext {
	// Try single header format first
	b3 := r.Header.Get(B3SingleHeader)
	if b3 != "" {
		parts := strings.Split(b3, "-")
		if len(parts) >= 2 {
			traceCtx := &TraceContext{
				TraceID: parts[0],
				SpanID:  parts[1],
				Sampled: true,
			}
			if len(parts) >= 3 {
				traceCtx.ParentSpanID = parts[2]
			}
			if len(parts) >= 4 {
				sampled := parts[3]
				traceCtx.Sampled = sampled == "1" || sampled == "true"
			}
			return traceCtx
		}
	}

	// Try multi-header format
	traceID := r.Header.Get(B3TraceIDHeader)
	spanID := r.Header.Get(B3SpanIDHeader)
	if traceID == "" || spanID == "" {
		return nil
	}

	parentSpanID := r.Header.Get(B3ParentSpanIDHeader)
	sampled := r.Header.Get(B3SampledHeader)

	return &TraceContext{
		TraceID:      traceID,
		SpanID:       spanID,
		ParentSpanID: parentSpanID,
		Sampled:      sampled == "1" || sampled == "true",
	}
}

// extractJaegerTraceContext extracts trace context from Jaeger headers
// Format: uber-trace-id: <trace-id>:<span-id>:<parent-id>:<flags>
func extractJaegerTraceContext(r *http.Request) *TraceContext {
	jaegerTrace := r.Header.Get(JaegerTraceHeader)
	if jaegerTrace == "" {
		return nil
	}

	parts := strings.Split(jaegerTrace, ":")
	if len(parts) != 4 {
		return nil
	}

	traceID := parts[0]
	spanID := parts[1]
	parentID := parts[2]
	flags := parts[3]

	return &TraceContext{
		TraceID:      traceID,
		SpanID:       spanID,
		ParentSpanID: parentID,
		Sampled:      flags == "1" || (len(flags) > 0 && flags[0] == '1'),
	}
}

// extractPulseTraceContext extracts trace context from Pulse custom headers
func extractPulseTraceContext(r *http.Request) *TraceContext {
	traceID := r.Header.Get(PulseTraceIDHeader)
	spanID := r.Header.Get(PulseSpanIDHeader)

	if traceID == "" {
		return nil
	}

	return &TraceContext{
		TraceID:      traceID,
		SpanID:       spanID,
		ParentSpanID: r.Header.Get(PulseParentIDHeader),
		Sampled:      true, // Always sample for our custom headers
	}
}

// InjectTraceContext injects trace context into HTTP headers
// It injects in multiple formats for maximum compatibility
func InjectTraceContext(r *http.Request, ctx *TraceContext) {
	if r == nil || ctx == nil || ctx.TraceID == "" {
		return
	}

	// Inject W3C Trace Context (OpenTelemetry compatible)
	samplingFlag := "00"
	if ctx.Sampled {
		samplingFlag = "01"
	}
	r.Header.Set(W3CTraceParentHeader, "00-"+ctx.TraceID+"-"+ctx.SpanID+"-"+samplingFlag)

	// Inject B3 headers (Zipkin)
	r.Header.Set(B3TraceIDHeader, ctx.TraceID)
	r.Header.Set(B3SpanIDHeader, ctx.SpanID)
	if ctx.ParentSpanID != "" {
		r.Header.Set(B3ParentSpanIDHeader, ctx.ParentSpanID)
	}
	if ctx.Sampled {
		r.Header.Set(B3SampledHeader, "1")
	} else {
		r.Header.Set(B3SampledHeader, "0")
	}

	// Inject Jaeger header
	sampledFlag := "0"
	if ctx.Sampled {
		sampledFlag = "1"
	}
	r.Header.Set(JaegerTraceHeader, ctx.TraceID+":"+ctx.SpanID+":"+ctx.ParentSpanID+":"+sampledFlag)

	// Inject Pulse custom headers
	r.Header.Set(PulseTraceIDHeader, ctx.TraceID)
	r.Header.Set(PulseSpanIDHeader, ctx.SpanID)
	if ctx.ParentSpanID != "" {
		r.Header.Set(PulseParentIDHeader, ctx.ParentSpanID)
	}
}

// CreateSpanFromRequest creates a new span from an HTTP request
// It extracts trace context from the request headers if available
func CreateSpanFromRequest(r *http.Request, spanName string, serviceName string) *models.Span {
	if r == nil {
		return nil
	}

	// Extract trace context from request headers
	traceCtx := ExtractTraceContext(r)

	var span *models.Span
	if traceCtx != nil && traceCtx.TraceID != "" {
		// Create span with existing trace context
		span = models.NewSpan(spanName, serviceName, traceCtx.TraceID)

		// Set parent if available
		if traceCtx.ParentSpanID != "" {
			span.SetParent(traceCtx.ParentSpanID)
		} else if traceCtx.SpanID != "" {
			// If no explicit parent ID but we have a span ID, use that as parent
			span.SetParent(traceCtx.SpanID)
		}
	} else {
		// Create a new root span with a new trace ID
		traceID := models.GenerateID()
		span = models.NewSpan(spanName, serviceName, traceID)
	}

	// Add HTTP metadata as tags
	span.AddTag("http.method", r.Method)
	span.AddTag("http.url", r.URL.String())
	span.AddTag("http.host", r.Host)
	span.AddTag("http.user_agent", r.UserAgent())

	// Add remote IP if available
	remoteAddr := r.RemoteAddr
	if remoteAddr != "" {
		// Strip port if present
		if colonIndex := strings.LastIndex(remoteAddr, ":"); colonIndex != -1 {
			remoteAddr = remoteAddr[:colonIndex]
		}
		span.AddTag("http.client_ip", remoteAddr)
	}

	return span
}
