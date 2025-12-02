from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Simple health check endpoint to verify API is running.
    """
    return Response({
        'status': 'ok',
        'message': 'API is running successfully',
        'version': '1.0.0'
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def hello_world(request):
    """
    Example endpoint that responds differently based on HTTP method.
    """
    if request.method == 'GET':
        return Response({
            'message': 'Hello from Django API!',
            'method': 'GET'
        })

    elif request.method == 'POST':
        name = request.data.get('name', 'World')
        return Response({
            'message': f'Hello, {name}!',
            'method': 'POST',
            'received_data': request.data
        }, status=status.HTTP_201_CREATED)
