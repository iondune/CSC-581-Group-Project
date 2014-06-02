from updater.models import Station
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db.transaction import commit_on_success

class Command(BaseCommand):
    args = '<poll_id poll_id ...>'
    help = 'Closes the specified poll for voting'

    def handle(self, *args, **options):
        parseStations()

        self.stdout.write('Successfully added stations to database.')

@commit_on_success
def parseStations():
    print 'Adding stations to the database...'

    ishFilename = "updater/data/ISH-HISTORY.TXT"

    f = open(ishFilename)

    lines = f.readlines()

    f.close()

    Station.objects.all().delete()

    doParse = False

    for i in xrange(len(lines)):
        line = lines[i].strip()

        if line.startswith("USAF") and line.endswith("END"):
            doParse = True
            skipParse = True

        if len(line) == 0 or not doParse or skipParse:
            skipParse = False
            continue

        start = 0
        stop = start + 7
        usaf = line[start:stop].strip()
        start = stop
        stop = start + 6
        wban = line[start:stop].strip()
        start = stop
        stop = start + 30
        stationName = line[start:stop].strip()
        start = stop
        stop = start + 6
        country = line[start:stop].strip()
        start = stop
        stop = start + 3
        state = line[start:stop].strip()
        start = stop
        stop = start + 6
        call = line[start:stop].strip()
        start = stop
        stop = start + 7
        latitude = line[start:stop].strip()
        start = stop
        stop = start + 8
        longitude = line[start:stop].strip()
        start = stop
        stop = start + 10
        elevation = line[start:stop].strip()
        start = stop
        stop = start + 9
        begin = line[start:stop].strip()
        start = stop
        end = line[start:].strip()

        newStation = Station()

        try:
            if usaf != '999999':
                usaf = int(usaf)
                newStation.usaf = usaf
        except ValueError:
            pass

        try:
            if wban != '99999':
                wban = int(wban)
                newStation.wban = wban
        except ValueError:
            pass

        isValidLocation = True

        try:
            latitude = float(latitude) / 1000.0
        except ValueError:
            isValidLocation = False
            pass

        try:
            longitude = float(longitude) / 1000.0
        except ValueError:
            isValidLocation = False
            pass

        if isValidLocation:
            newStation.location = Point(longitude, latitude)

        newStation.stationName = stationName

        newStation.country = country

        newStation.state = state

        newStation.call = call

        try:
            if '99999' not in elevation:
                elevation = float(elevation) / 10.0
                newStation.elevation = elevation
        except ValueError:
            pass

        newStation.save()

        if i % 1000 == 0:
            print 'Added', i, 'stations'


def isEmptyString(string):
    return len(string) == 0

if __name__ == "__main__":
    parseStations()