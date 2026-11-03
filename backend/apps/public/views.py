from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import Service, ServiceCategory, Solution
from apps.core.models import SiteSettings
from apps.crm.models import Source
from apps.inventory.models import Product
from apps.projects.models import Project, ProjectPhoto

from .serializers import (
    EnquiryCreateSerializer,
    PublicCategorySerializer,
    PublicProductSerializer,
    PublicProjectDetailSerializer,
    PublicProjectListSerializer,
    PublicServiceDetailSerializer,
    PublicServiceListSerializer,
    PublicSiteSerializer,
    PublicSolutionSerializer,
)


class PublicMixin:
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"
    pagination_class = None
    filter_backends = []


def portfolio_projects():
    return (
        Project.objects.filter(show_in_portfolio=True)
        .exclude(status=Project.Status.CANCELLED)
        .prefetch_related(
            "services",
            Prefetch("photos", queryset=ProjectPhoto.objects.filter(is_public=True), to_attr="public_photos"),
        )
        .order_by("-is_featured", "-completed_date", "-created_at")
    )


class SiteView(PublicMixin, APIView):
    serializer_class = PublicSiteSerializer

    def get(self, request):
        return Response(PublicSiteSerializer(SiteSettings.load()).data)


class CategoryListView(PublicMixin, generics.ListAPIView):
    serializer_class = PublicCategorySerializer

    def get_queryset(self):
        return ServiceCategory.objects.filter(is_published=True).prefetch_related(
            Prefetch(
                "services",
                queryset=Service.objects.filter(is_published=True).order_by("order", "title"),
                to_attr="published_services",
            )
        )


class ServiceListView(PublicMixin, generics.ListAPIView):
    serializer_class = PublicServiceListSerializer

    def get_queryset(self):
        queryset = Service.objects.filter(is_published=True, category__is_published=True).select_related("category")
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        if self.request.query_params.get("featured") in ("1", "true"):
            queryset = queryset.filter(is_featured=True)
        return queryset


class ServiceDetailView(PublicMixin, generics.RetrieveAPIView):
    serializer_class = PublicServiceDetailSerializer
    lookup_field = "slug"
    queryset = Service.objects.filter(is_published=True).select_related("category").prefetch_related("images", "solutions")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if "slug" in self.kwargs:
            context["related_projects"] = portfolio_projects().filter(services__slug=self.kwargs["slug"])[:6]
        return context


class SolutionListView(PublicMixin, generics.ListAPIView):
    serializer_class = PublicSolutionSerializer
    queryset = Solution.objects.filter(is_published=True)


class ProjectListView(PublicMixin, generics.ListAPIView):
    serializer_class = PublicProjectListSerializer

    def get_queryset(self):
        queryset = portfolio_projects()
        service = self.request.query_params.get("service")
        if service:
            queryset = queryset.filter(services__slug=service)
        if self.request.query_params.get("featured") in ("1", "true"):
            queryset = queryset.filter(is_featured=True)
        return queryset.distinct()


class ProjectDetailView(PublicMixin, APIView):
    serializer_class = PublicProjectDetailSerializer

    def get(self, request, slug):
        project = get_object_or_404(portfolio_projects(), slug=slug)
        return Response(PublicProjectDetailSerializer(project).data)


class ProductListView(PublicMixin, generics.ListAPIView):
    serializer_class = PublicProductSerializer
    queryset = Product.objects.filter(is_published=True)


class EnquiryCreateView(PublicMixin, generics.CreateAPIView):
    serializer_class = EnquiryCreateSerializer
    throttle_scope = "enquiry"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        honeypot = serializer.validated_data.pop("website", "")
        if not honeypot:
            serializer.save(source=Source.WEBSITE, ip_address=BaseThrottle().get_ident(request))
        # Bots get the same success response so they don't retry.
        return Response({"detail": _("Thank you! We will contact you shortly.")}, status=status.HTTP_201_CREATED)
