from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
{%- if cookiecutter.use_async == 'y' %}
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
{%- endif %}
from django.urls import include
from django.urls import path
{%- if cookiecutter.frontend_pipeline == 'Vite' %}
from django.urls import re_path
{%- endif %}
from django.views import defaults as default_views
{%- if cookiecutter.frontend_pipeline != 'Vite' %}
from django.views.generic import TemplateView
{%- endif %}
{%- if cookiecutter.rest_api == 'DRF' %}
from drf_spectacular.views import SpectacularAPIView
from drf_spectacular.views import SpectacularSwaggerView
from rest_framework.authtoken.views import obtain_auth_token
{%- elif cookiecutter.rest_api == 'Django Ninja' %}
{%- endif %}
{% if cookiecutter.rest_api == 'Django Ninja' or cookiecutter.frontend_pipeline == 'Vite' %}
{% if cookiecutter.rest_api == 'Django Ninja' -%}
from .api import api
{% endif -%}
{% if cookiecutter.frontend_pipeline == 'Vite' -%}
from .auth_views import account_login_redirect_view
from .auth_views import account_signup_redirect_view
from .auth_views import spa_auth_bootstrap_view
from .views import SpaView
{% endif -%}
{% endif %}
urlpatterns = [
    {%- if cookiecutter.frontend_pipeline == 'Vite' %}
    path("", SpaView.as_view(), name="home"),
    {%- else %}
    path("", TemplateView.as_view(template_name="pages/home.html"), name="home"),
    path(
        "about/",
        TemplateView.as_view(template_name="pages/about.html"),
        name="about",
    ),
    {%- endif %}
    # Django Admin, use {% raw %}{% url 'admin:index' %}{% endraw %}
    path(settings.ADMIN_URL, admin.site.urls),
    {%- if cookiecutter.frontend_pipeline == 'Vite' %}
    path("accounts/bootstrap/", spa_auth_bootstrap_view, name="account_spa_bootstrap"),
    path("accounts/login/", account_login_redirect_view, name="account_login"),
    path("accounts/signup/", account_signup_redirect_view, name="account_signup"),
    path("accounts/", include("allauth.urls")),
    path("_allauth/", include("allauth.headless.urls")),
    {%- endif %}
    {%- if cookiecutter.frontend_pipeline != 'Vite' %}
    # User management
    path("users/", include("{{ cookiecutter.project_slug }}.users.urls", namespace="users")),
    path("accounts/", include("allauth.urls")),
    {%- endif %}
    # Your stuff: custom urls includes go here
    # ...
    # Media files
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
]
{%- if cookiecutter.use_async == 'y' %}
if settings.DEBUG:
    # Static file serving when using Gunicorn + Uvicorn for local web socket development
    urlpatterns += staticfiles_urlpatterns()
{%- endif %}
{% if cookiecutter.rest_api == 'DRF' %}
# API URLS
urlpatterns += [
    # API base url
    path("api/", include("config.api_router")),
    # DRF auth token
    path("api/auth-token/", obtain_auth_token, name="obtain_auth_token"),
    path("api/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema"),
        name="api-docs",
    ),
]
{%- elif cookiecutter.rest_api == 'Django Ninja' %}

# API URLS
urlpatterns += [
    # API base url
    path("api/", api.urls),
]
{%- endif %}

if settings.DEBUG:
    # This allows the error pages to be debugged during development, just visit
    # these url in browser to see how these error pages look like.
    urlpatterns += [
        path(
            "400/",
            default_views.bad_request,
            kwargs={"exception": Exception("Bad Request!")},
        ),
        path(
            "403/",
            default_views.permission_denied,
            kwargs={"exception": Exception("Permission Denied")},
        ),
        path(
            "404/",
            default_views.page_not_found,
            kwargs={"exception": Exception("Page not Found")},
        ),
        path("500/", default_views.server_error),
    ]
    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar

        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
            *urlpatterns,
        ]

{%- if cookiecutter.frontend_pipeline == 'Vite' %}
urlpatterns += [
    re_path(
        r"^(?!admin/|api/|accounts/|_allauth/|media/|static/|__debug__/).+$",
        SpaView.as_view(),
        name="spa",
    ),
]
{%- endif %}
