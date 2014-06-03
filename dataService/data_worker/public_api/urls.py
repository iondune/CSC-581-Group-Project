from django.conf.urls import patterns, url

urlpatterns = patterns('public_api.views',
    # url(r'^(?i)data/weather/$', 'activity_post'),
    url(r'^data/weather/([a-zA-Z]+)', 'get_weather_layer'),
    url(r'^(?i)api/activity/date/(?P<key>[0-9-]+)', 'activity_list_by_date'),
    url(r'^(?i)api/activity/location/(?P<key>[a-zA-Z0-9_ -]+)', 'activity_list_by_location'),


    # url(r'^articles/([0-9]{4})/([0-9]{2})/$', 'news.views.month_archive'),
    # news.views.month_archive(request, '2005', '03').
)