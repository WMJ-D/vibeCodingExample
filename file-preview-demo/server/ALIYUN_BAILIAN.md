# Aliyun Bailian Embedding Compatibility

Aliyun Bailian provides OpenAI-compatible embedding APIs.

Use these values in the AI config panel:

- API Base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- API Key: your Bailian API Key
- Embedding model: `text-embedding-v4`, `text-embedding-v3`, `text-embedding-v2`, or `text-embedding-v1`

Server compatibility behavior:

- Requests to `dashscope.aliyuncs.com` and `*.maas.aliyuncs.com` automatically include `encoding_format: "float"`.
- `text-embedding-v4`, `text-embedding-v3`, and unknown Bailian embedding models are batched by 10 inputs per request.
- `text-embedding-v1` and `text-embedding-v2` are batched by 25 inputs per request.
- Multimodal embedding models such as `qwen3-vl-embedding` are not supported by Bailian OpenAI-compatible embedding endpoint.

Timeout and streaming behavior:

- Embedding requests use 60s timeout per batch and retry retryable failures twice.
- Chat and summary support SSE streaming through `/api/chat/stream` and `/api/knowledge/summary/stream`.
- Embedding indexing is not streamed because embedding APIs return vectors only after the batch is complete.
