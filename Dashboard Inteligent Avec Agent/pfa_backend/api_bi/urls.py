from django.urls import path

from .views import generer_dashboard, upload_dataset

urlpatterns = [
    path("generate/", generer_dashboard, name="generate_dashboard"),
    path("upload/", upload_dataset, name="upload_dataset"),
]