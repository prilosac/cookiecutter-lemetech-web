import json
from urllib.parse import urlencode

from allauth.account.adapter import get_adapter as get_account_adapter
from allauth.headless.base.response import AuthenticationResponse
from allauth.headless.base.response import ConfigResponse
from allauth.headless.constants import Client
from allauth.headless.internal.decorators import mark_request_as_headless
from django.http import HttpResponseRedirect
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import ensure_csrf_cookie


def _response_payload(response) -> dict:
    return json.loads(response.content)


class FrontendAuthRedirectView(View):
    frontend_path = "/"

    def get(self, request, *args, **kwargs):
        redirect_url = self.frontend_path
        next_url = request.GET.get("next")
        if next_url and get_account_adapter().is_safe_url(next_url):
            redirect_url = f"{redirect_url}?{urlencode({'next': next_url})}"
        return HttpResponseRedirect(redirect_url)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SPAAuthBootstrapView(View):
    def get(self, request, *args, **kwargs):
        mark_request_as_headless(request, Client.BROWSER)
        bootstrap = {
            "csrf_token": get_token(request),
            "config": _response_payload(ConfigResponse(request)),
            "session": _response_payload(AuthenticationResponse(request)),
        }
        return JsonResponse(bootstrap)


class AccountLoginRedirectView(FrontendAuthRedirectView):
    frontend_path = "/account/login"


class AccountSignupRedirectView(FrontendAuthRedirectView):
    frontend_path = "/account/signup"


account_login_redirect_view = AccountLoginRedirectView.as_view()
account_signup_redirect_view = AccountSignupRedirectView.as_view()
spa_auth_bootstrap_view = SPAAuthBootstrapView.as_view()
