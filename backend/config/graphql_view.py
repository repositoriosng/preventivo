from strawberry.django.views import GraphQLView

from .schema import schema


class InventoryGraphQLView(GraphQLView):
    schema = schema
