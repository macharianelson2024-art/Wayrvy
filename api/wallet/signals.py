from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .services import ensure_default_goal


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_goal(sender, instance, created, raw=False, **kwargs):
    if created and not raw:
        ensure_default_goal(instance)