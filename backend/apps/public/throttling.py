from rest_framework.throttling import ScopedRateThrottle


class VisitorRateThrottle(ScopedRateThrottle):
    """Limits visitors, not the website itself.

    The website renders its pages by calling this API from one server address, so counting those
    calls would make all visitors share a single limit; once it ran out, real pages answered 404.
    Visitors always reach Django through nginx, which sets X-Forwarded-For, so a read without that
    header came from the website inside the private network. Other scopes (the enquiry form and
    the paid assistant) stay limited either way.
    """

    def allow_request(self, request, view):
        if view.throttle_scope == "public" and "HTTP_X_FORWARDED_FOR" not in request.META:
            return True
        return super().allow_request(request, view)
