"""Multi-LLM fallback: OpenAI → Groq → Together → deterministic template."""

import os


class LLMRouter:
    PROVIDERS = [
        ("openai", "gpt-4o-mini", "OPENAI_API_KEY"),
        ("groq", "llama-3.3-70b-versatile", "GROQ_API_KEY"),
        ("together", "mistralai/Mistral-7B-Instruct-v0.2", "TOGETHER_API_KEY"),
    ]

    def __init__(self, system_prompt: str = ""):
        self.system_prompt = system_prompt

    async def generate(self, user_prompt: str, max_tokens: int = 1000) -> tuple[str, str]:
        for provider, model, env_key in self.PROVIDERS:
            api_key = os.getenv(env_key)
            if not api_key:
                continue
            try:
                result = await self._call(provider, model, api_key, user_prompt, max_tokens)
                if result:
                    return result, provider
            except Exception as e:
                from utils.logger import get_logger

                get_logger("LLMRouter").warning(f"{provider} failed: {e}")
        return self._template_fallback(user_prompt), "template"

    async def _call(
        self, provider: str, model: str, api_key: str, prompt: str, max_tokens: int
    ) -> str | None:
        msgs = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt},
        ]
        if provider == "openai":
            from openai import AsyncOpenAI

            resp = await AsyncOpenAI(api_key=api_key).chat.completions.create(
                model=model, messages=msgs, max_tokens=max_tokens
            )
            return resp.choices[0].message.content
        if provider == "groq":
            from groq import AsyncGroq

            resp = await AsyncGroq(api_key=api_key).chat.completions.create(
                model=model, messages=msgs, max_tokens=max_tokens
            )
            return resp.choices[0].message.content
        if provider == "together":
            import httpx

            async with httpx.AsyncClient() as client:
                r = await client.post(
                    "https://api.together.xyz/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"model": model, "messages": msgs, "max_tokens": max_tokens},
                    timeout=30,
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
        return None

    def _template_fallback(self, prompt: str) -> str:
        return (
            "Analysis complete. The pipeline identified candidate molecules, performed "
            "molecular docking with selectivity analysis, and screened ADMET properties. "
            "Results are computational predictions — validate experimentally."
        )
