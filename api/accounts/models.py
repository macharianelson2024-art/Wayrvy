

from django.db import models
from django.contrib.auth.models import AbstractBaseUser ,PermissionsMixin
from .manager import UserManager

import uuid
class User(AbstractBaseUser , PermissionsMixin) :
    
    class WithdrawAfter(models.IntegerChoices):
        ONE_DAY  = (24 , "ONE DAY")
        ONE_WEEK = (168 , "ONE WEEK")
        ONE_MONTH = (720 , "ONE MONTH") 
        
    id = models.UUIDField(default = uuid.uuid4 , primary_key = True , editable = False)
    phone = models.CharField(max_length = 15 ,unique = True)
    first_name = models.CharField(max_length = 64 , null = False , blank = False)
    second_name = models.CharField(max_length = 64 , null = False , blank = False)
    is_active = models.BooleanField(default = True)
    is_staff = models.BooleanField(default = False)
    date_joined = models.DateTimeField(auto_now_add = True)
    email = models.EmailField(unique = True)
    withdraw_after = models.PositiveIntegerField(choices = WithdrawAfter.choices , default = WithdrawAfter.ONE_DAY)
    
    
    objects = UserManager()
    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS  = ["first_name" , "second_name" , "email"]
    
    def __str__(self):
        return self.first_name
    
    class Meta:
        verbose_name = "Users"
        verbose_name_plural = "User"
        