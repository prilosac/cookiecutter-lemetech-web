import json
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.templatetags.static import static
from django.views.generic import TemplateView


class SpaView(TemplateView):
    template_name = "spa.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self._build_asset_context())
        return context

    def _build_asset_context(self):
        try:
            return self._load_asset_context()
        except ImproperlyConfigured:
            if not settings.DEBUG:
                raise

            return {
                "vite_css_urls": [],
                "vite_js_url": None,
                "vite_missing_build": True,
                "vite_dev_server_url": settings.VITE_DEV_SERVER_URL,
            }

    def _load_asset_context(self):
        manifest_path = Path(settings.VITE_MANIFEST_PATH)
        if not manifest_path.exists():
            msg = (
                "Vite build manifest not found. "
                "Run 'cd frontend && npm install && npm run build' "
                "before serving the SPA from Django."
            )
            raise ImproperlyConfigured(msg)

        manifest = json.loads(manifest_path.read_text())
        entry = manifest.get(settings.VITE_MANIFEST_ENTRY)
        if entry is None:
            msg = (
                f"Could not find '{settings.VITE_MANIFEST_ENTRY}' "
                "in the Vite manifest."
            )
            raise ImproperlyConfigured(msg)

        return {
            "vite_css_urls": [static(path) for path in entry.get("css", [])],
            "vite_js_url": static(entry["file"]),
            "vite_missing_build": False,
            "vite_dev_server_url": settings.VITE_DEV_SERVER_URL,
        }
