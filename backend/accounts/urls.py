from django.urls import path
from .views import PhoneAuthView, UserProfileView, SubmitKYCView

app_name = 'accounts'

urlpatterns = [
    path('login/', PhoneAuthView.as_view(), name='phone_login'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('kyc/submit/', SubmitKYCView.as_view(), name='kyc_submit'),
]
