import sys
import getopt

def main():
    ishFilename = "ISH-HISTORY.TXT"
    f = open(ishFilename)

    lines = f.readlines()

    f.close()

    doParse = False

    for i in xrange(len(lines)):
        if i > 30:
            break

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

        print "usaf", usaf
        print "wban", wban
        print "stationName", stationName
        print "country", country
        print "state", state
        print "call", call
        print "latitude", latitude
        print "longitude", longitude
        print "elevation", elevation
        print "begin", begin
        print "end", end

        usaf = int(usaf)
        wban = int(wban)
        latitude = float(latitude) / 1000.0
        longitude = float(longitude) / 1000.0

        

        newStation = Station()


if __name__ == "__main__":
    main()


    # from django.db import models
from django.contrib.gis.db import models

class Station(models.Model):

    usaf = models.IntegerField()
    wban = models.IntegerField()
    stationName = models.CharField()
    country = models.CharField()
    state = models.CharField()
    call = models.CharField()
    location = models.PointField()
    elevation = models.IntegerField()

    objects = models.GeoManager()