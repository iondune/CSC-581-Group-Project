from updater.models import DailySummary
from updater.models import Station
import datetime
from django.core.management.base import BaseCommand
from django.db.transaction import commit_on_success

class Command(BaseCommand):
    args = '<poll_id poll_id ...>'
    help = 'Closes the specified poll for voting'

    def handle(self, *args, **options):
        parseSummaries()
        set_up_fks()

        self.stdout.write('Successfully added summaries to database.')

@commit_on_success
def parseSummaries():
    print 'Adding stations to the database...'

    filename = "updater/data/CDO1497257038711.txt"

    f = open(filename)

    lines = f.readlines()

    f.close()

    DailySummary.objects.all().delete()

    doParse = False

    for i in xrange(len(lines)):
        line = lines[i].strip()

        if line.startswith("STN") and line.endswith("FRSHTT,"):
            doParse = True
            skipParse = True

        if len(line) == 0 or not doParse or skipParse:
            skipParse = False
            continue

        station = line[0:6].strip()
        wban = line[7:12].strip()
        year = line[14:18].strip()
        month = line[18:20].strip()
        day = line[20:22].strip()
        temperature = line[24:30].strip()
        dew_point = line[35:41].strip()
        sea_level_pressure = line[46:52].strip()
        station_pressure = line[57:63].strip()
        visibility = line[68:73].strip()
        wind_speed = line[78:83].strip()
        max_wind_speed = line[88:93].strip()
        gust = line[95:100].strip()
        max_temperature = line[102:108].strip()
        min_temperature = line[110:116].strip()
        precipitation = line[118:123].strip()
        snow_depth = line[125:130].strip()

        summary = DailySummary()

        try:
            if station != '999999':
                station = int(station)
                summary.stn = station
        except ValueError:
            pass

        try:
            if wban != '99999':
                wban = int(wban)
                summary.wban = wban
        except ValueError:
            pass

        is_valid_date = True

        try:
            year = int(year)
        except ValueError:
            is_valid_date = False
            pass

        try:
            month = int(month)
        except ValueError:
            is_valid_date = False
            pass

        try:
            day = int(day)
        except ValueError:
            is_valid_date = False
            pass

        if is_valid_date:
            date = datetime.date(year, month, day)
            summary.date = date

        try:
            if not is_missing(temperature, '9999.9'):
                summary.temperature = float(temperature)
        except ValueError:
            pass

        try:
            if not is_missing(dew_point, '9999.9'):
                summary.dew_point = float(dew_point)
        except ValueError:
            pass

        try:
            if not is_missing(sea_level_pressure, '9999.9'):
                summary.sea_level_pressure = float(sea_level_pressure)
        except ValueError:
            pass

        try:
            if not is_missing(station_pressure, '9999.9'):
                summary.station_pressure = float(station_pressure)
        except ValueError:
            pass

        try:
            if not is_missing(visibility, '999.9'):
                summary.visibility = float(visibility)
        except ValueError:
            pass

        try:
            if not is_missing(wind_speed, '999.9'):
                summary.wind_speed = float(wind_speed)
        except ValueError:
            pass

        try:
            if not is_missing(max_wind_speed, '999.9'):
                summary.max_wind_speed = float(max_wind_speed)
        except ValueError:
            pass

        try:
            if not is_missing(gust, '999.9'):
                summary.gust = float(gust)
        except ValueError:
            pass

        try:
            if not is_missing(max_temperature, '9999.9'):
                summary.max_temperature = float(max_temperature)
        except ValueError:
            pass

        try:
            if not is_missing(min_temperature, '9999.9'):
                summary.min_temperature = float(min_temperature)
        except ValueError:
            pass

        try:
            if not is_missing(precipitation, '99.99'):
                summary.precipitation = float(precipitation)
        except ValueError:
            pass

        try:
            if not is_missing(snow_depth, '999.9'):
                summary.snow_depth = float(snow_depth)
        except ValueError:
            pass

        summary.save()

        if i % 1000 == 0:
            print 'Saved', i, 'summaries'

def is_missing(actual, missing_template):
    return actual == missing_template

@commit_on_success
def set_up_fks():
    stations = Station.objects.all()
    summaries = DailySummary.objects.all()

    counter = 0

    for i in xrange(len(summaries)):
        summary = summaries[i]

        usaf_stations = stations\
            .filter(usaf=summary.stn)\
            .exclude(usaf__isnull=True)\
            .exclude(location__isnull=True)
        wban_stations = stations\
            .filter(wban=summary.wban)\
            .exclude(wban__isnull=True)\
            .exclude(location__isnull=True)

        both_match = stations\
            .filter(usaf=summary.stn)\
            .exclude(usaf__isnull=True)\
            .filter(wban=summary.wban)\
            .exclude(wban__isnull=True)\
            .exclude(location__isnull=True)

        found_station = False

        if len(both_match) > 0:
            station = both_match[0]
            found_station = True
        elif len(usaf_stations) > 0:
            station = usaf_stations[0]
            found_station = True
        elif len(wban_stations) > 0:
            station = wban_stations[0]
            found_station = True

        # print str(summary.stn) + ' ' + str(summary.wban) + ' ' + str(summary.date)
        # print str(station.usaf) + ' ' + str(station.wban) + ' ' + station.stationName + ' ' + str(station.location)

        if found_station:
            counter += 1
            summary.station = station
            summary.save()

        if counter % 1000 == 0:
            print 'Associated', counter, 'stations with summaries.'

if __name__ == "__main__":
    parseSummaries()