from django.shortcuts import render
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from updater import json_getter


class JSONResponse(HttpResponse):
    """
    An HttpResponse that renders its content into JSON.
    """
    def __init__(self, data, **kwargs):
        content = JSONRenderer().render(data)
        kwargs['content_type'] = 'application/json'
        super(JSONResponse, self).__init__(content, **kwargs)

@csrf_exempt
def activity_list_by_location(request, key):
    """
    Lists all activities based on the given location
    """
    if request.method == 'GET':
        try:
            activities = Activity.objects.filter(location__iexact = key)
            serializer = ActivitySerializer(activities, many=True)
            return JSONResponse(serializer.data)
        except Activity.DoesNotExist:
            return HttpResponse(status=404)

@csrf_exempt
def activity_list_by_date(request, key):
    """
    Lists all activities based on the given date
    """
    if request.method == 'GET':
        try:
            activities = Activity.objects.filter(date__iexact = key)
            serializer = ActivitySerializer(activities, many=True)
            return JSONResponse(serializer.data)
        except Activity.DoesNotExist:
            return HttpResponse(status=404)

@csrf_exempt
def activity_post(request):
    """
    Post a new activity
    """
    if request.method == 'POST':
        data = JSONParser().parse(request)
        serializer = ActivitySerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return JSONResponse(serializer.data, status=201)
        else:
            return JSONResponse(serializer.errors, status=400)





@csrf_exempt
def get_weather_layer(request, type):
    print 'here'
    json_getter.getJson(type)
    print type
    return HttpResponse(status=404)

@csrf_exempt
def hello(request):
    print 'HELLO'
    return HttpResponse(status=500)