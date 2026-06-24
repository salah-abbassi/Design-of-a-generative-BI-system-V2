from django.urls import path

from .views import confirm_upload, generer_dashboard, upload_dataset

urlpatterns = [
    path("generate/", generer_dashboard, name="generate_dashboard"),
    path("upload/", upload_dataset, name="upload_dataset"),
    path("upload/confirm/", confirm_upload, name="confirm_upload"),
]