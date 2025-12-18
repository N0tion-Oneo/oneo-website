"""URL routing for Feed API."""
from django.urls import path
from . import views

urlpatterns = [
    # Feed (read-only for all authenticated users)
    path('', views.list_feed, name='feed-list'),
    path('<uuid:post_id>/', views.get_feed_post, name='feed-detail'),

    # Create/Update/Delete (clients & staff)
    path('create/', views.create_feed_post, name='feed-create'),
    path('<uuid:post_id>/update/', views.update_feed_post, name='feed-update'),
    path('<uuid:post_id>/delete/', views.delete_feed_post, name='feed-delete'),

    # My Posts (for managing own company's posts)
    path('my/', views.list_my_posts, name='feed-my-posts'),
    path('my/<uuid:post_id>/', views.get_my_post, name='feed-my-post-detail'),

    # Comments
    path('comments/', views.list_comments, name='comments-list'),
    path('comments/create/', views.create_comment, name='comments-create'),
    path('comments/<uuid:comment_id>/update/', views.update_comment, name='comments-update'),
    path('comments/<uuid:comment_id>/delete/', views.delete_comment, name='comments-delete'),
]
