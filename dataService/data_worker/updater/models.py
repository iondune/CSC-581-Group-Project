from django.contrib.gis.db import models

# Create your models here.
class Station(models.Model):

    usaf = models.IntegerField(null=True)
    wban = models.IntegerField(null=True)
    stationName = models.CharField(max_length=128)
    country = models.CharField(max_length=128)
    state = models.CharField(max_length=128)
    call = models.CharField(max_length=128)
    location = models.PointField(geography=True, null=True)
    elevation = models.FloatField(null=True)

    objects = models.GeoManager()

    def __unicode__(self):
        return str(self.usaf)

class DailySummary(models.Model):
    # related_name='+' prevents backward relation from being added to schema;
    # the relation was causing problems because of a bug in django-geojson
    # http://stackoverflow.com/questions/22898547/error-with-geodjango-serializer-and-foreignkey-field
    station = models.ForeignKey(Station, null=True, related_name='+')
    stn = models.IntegerField(null=True)
    wban = models.IntegerField(null=True)
    date = models.DateField(null=True)
    temperature = models.FloatField(null=True)
    dew_point = models.FloatField(null=True)
    sea_level_pressure = models.FloatField(null=True) # do not use in 581
    station_pressure = models.FloatField(null=True)
    visibility = models.FloatField(null=True)
    wind_speed = models.FloatField(null=True)
    max_wind_speed = models.FloatField(null=True)
    gust = models.FloatField(null=True) # do not use in 581
    max_temperature = models.FloatField(null=True) # do not use in 581
    min_temperature = models.FloatField(null=True) # do not use in 581
    precipitation = models.FloatField(null=True)
    snow_depth = models.FloatField(null=True) # do not use in 581

    objects = models.GeoManager()

    def __unicode__(self):
        return str(self.stn) + ' ' + str(self.wban) + ' ' + str(self.date)