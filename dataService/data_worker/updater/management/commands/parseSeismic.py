import datetime
import geojson
import json
from updater.models import Station, Earthquake
from django.contrib.gis.geos import Point, GEOSGeometry
from django.core.management.base import BaseCommand
from django.db.transaction import commit_on_success

class Command(BaseCommand):
    args = '<poll_id poll_id ...>'
    help = 'Closes the specified poll for voting'

    def handle(self, *args, **options):
        parseStations()

        self.stdout.write('Successfully added earthquakes to database.')

@commit_on_success
def parseStations():
    print 'Adding earthquakes to the database...'

    ishFilename = "updater/data/all_month.json"

    f = open(ishFilename)

    pnt = GEOSGeometry(
        '{ "type": "Point", "coordinates": [ 5.000000, 23.000000 ] }')  # GeoJSON

    parsed = geojson.loads(f.read())

    collection = geojson.FeatureCollection(parsed)

    features = collection['features']['features']

    # print json.dumps(features, indent=4)

    f.close()

    Earthquake.objects.all().delete()

    i = 0

    for feature in features:
        properties = feature['properties']
        # print geojson.dumps(properties, indent=4)

        # geom = feature['geometry']
        geom = GEOSGeometry(geojson.dumps(feature['geometry']))
        depth = geom[2]
        geom = 'Point (' + str(geom[0]) + ' ' + str(geom[1]) + ')'

        earthquake = Earthquake()

        earthquake.location = geom
        earthquake.magnitude = properties['mag']
        earthquake.depth = depth
        earthquake.affected_stations = properties['felt']
        earthquake.significance = properties['sig']

        earthquake.date = datetime.datetime.fromtimestamp(properties['time'] / 1000)

        earthquake.save()

        i += 1
        if i % 50 == 0:
            print 'Added', i, 'earthquakes'


def isEmptyString(string):
    return len(string) == 0

if __name__ == "__main__":
    parseStations()