from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()


# urlpatterns = patterns('',
                       # url(r'^', include('public_api.urls')), )

# urlpatterns = patterns('', url(r'^data/', include('public_api.urls')), (r'^a/$', 'public_api.views.hello'),
#
#     # Examples:
#     # url(r'^$', 'pipelion.views.home', name='home'),
#     # url(r'^pipelion/', include('pipelion.foo.urls')),
#
#     # Uncomment the admin/doc line below to enable admin documentation:
#     # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
#
#     # Uncomment the next line to enable the admin:
#     # url(r'^admin/', include(admin.site.urls)),
# )

urlpatterns=patterns('', url(r'^', include('public_api.urls')), )