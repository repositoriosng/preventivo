from django.contrib import admin
from django.views.decorators.csrf import csrf_exempt
from django.urls import path
from strawberry.django.views import GraphQLView

from .schema import schema

urlpatterns = [
	path('admin/', admin.site.urls),
	path('graphql/', csrf_exempt(GraphQLView.as_view(schema=schema, graphql_ide='graphiql'))),
]
