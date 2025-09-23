# Setlist Database Management Scripts

## Start the database

docker-compose up -d

## Stop the database

docker-compose down

## Stop and remove all data

docker-compose down -v

## View database logs

docker-compose logs sqlserver

## Connect to SQL Server using sqlcmd

docker exec -it setlist-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U SA -P 'SetlistDev123!'

## Database Connection Details

- **Host**: localhost
- **Port**: 1434
- **Database**: SetlistDb
- **Username**: SA
- **Password**: SetlistDev123!

## Connection String

```
Server=localhost,1434;Database=SetlistDb;User Id=SA;Password=SetlistDev123!;TrustServerCertificate=true;
```
