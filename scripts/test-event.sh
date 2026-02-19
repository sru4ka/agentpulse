#!/bin/bash
# Send a test event with prompt + response data to verify Event Detail works
#
# Usage:
#   ./scripts/test-event.sh <API_KEY> [APP_URL]
#
# Example:
#   ./scripts/test-event.sh ap_abc123
#   ./scripts/test-event.sh ap_abc123 https://agentpulses.com

API_KEY="${1:?Usage: $0 <API_KEY> [APP_URL]}"
APP_URL="${2:-http://localhost:3000}"

echo "Sending test event to ${APP_URL}/api/events ..."

curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST "${APP_URL}/api/events" \
  -H "Content-Type: application/json" \
  -d '{
  "api_key": "'"${API_KEY}"'",
  "agent_name": "test-agent",
  "framework": "langchain",
  "events": [
    {
      "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
      "provider": "openai",
      "model": "gpt-4o",
      "input_tokens": 1250,
      "output_tokens": 380,
      "latency_ms": 2340,
      "status": "success",
      "task_context": "customer-support-bot",
      "tools_used": ["search_docs", "get_order_status"],
      "prompt_messages": [
        {
          "role": "system",
          "content": "You are a helpful customer support agent for an e-commerce store. You have access to tools for searching documentation and checking order status. Be concise and friendly."
        },
        {
          "role": "user",
          "content": "Hi, I placed an order 3 days ago (order #ORD-4821) and it still shows as processing. Can you check the status?"
        },
        {
          "role": "assistant",
          "content": "Let me check that order for you right away."
        },
        {
          "role": "tool",
          "tool": "get_order_status",
          "content": "{\"order_id\": \"ORD-4821\", \"status\": \"shipped\", \"tracking\": \"1Z999AA10123456784\", \"carrier\": \"UPS\", \"estimated_delivery\": \"2026-02-21\"}"
        },
        {
          "role": "user",
          "content": "Great, and do you have a return policy if it does not fit?"
        },
        {
          "role": "tool",
          "tool": "search_docs",
          "content": "Return Policy: Items can be returned within 30 days of delivery. Items must be unworn with original tags. Free return shipping label provided."
        }
      ],
      "response_text": "Great news! Your order #ORD-4821 has actually shipped! Here are the details:\n\n- **Carrier:** UPS\n- **Tracking:** 1Z999AA10123456784\n- **Estimated delivery:** February 21, 2026\n\nAs for returns — if it doesn'\''t fit, no worries! You have 30 days from delivery to return it. Items just need to be unworn with the original tags, and we'\''ll provide a free return shipping label.\n\nAnything else I can help with?"
    }
  ]
}'

echo ""
echo "Done! Check your Events page — click the new event and look at the Prompt and Response tabs."
