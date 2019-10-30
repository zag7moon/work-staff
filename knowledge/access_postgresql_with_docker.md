You have to do 2 things in order to allow your container to access your host's postgresql database
1. Make your postgresql listen to an external ip address
2. Let this client ip  (your docker container) access your postgresql database with a given user

Obs: By "Host" here I mean "the server where docker is running on". 

# Make your postgresql listen to an external ip address
Find your postgresql.conf (in case you don't know where it is)

`$ sudo find / -type f -name postgresql.conf`
`# => /etc/postgresql/9.5/main/postgresql.conf`

Change postgresql.conf to allow external access

`$ sudo atom /etc/postgresql/9.5/main/postgresql.conf # or the path you found before`

Look for the line:
`#listen_addresses = 'localhost'		# what IP address(es) to listen on;`

Uncomment and set the external ip adress that'll be trying to access your DB. 
If you don't know it, or want to free all ips to access it (not that safe), set it to '*':

`listen_addresses = '*'		# what IP address(es) to listen on;`

Restart postgres

```$ /etc/init.d/postgresql restart```

You can check if this worked out with this command:

`$ netstat -nlt`

It will output something like this:
```
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 0.0.0.0:5432            0.0.0.0:*               LISTEN 
```
See that it has the address 0.0.0.0 on port 5432.

# Let your container access your postgresql database with a given user
Find your pg_hba.conf

`$ sudo find / -type f -name pg_hba.conf`
`# => /etc/postgresql/9.5/main/pg_hba.conf`

Change pg_hba.conf to allow access to your database

`$ sudo atom /etc/postgresql/9.5/main/pg_hba.conf # or the path you found before`

```
# This file controls: which hosts are allowed to connect, how clients
# are authenticated, which PostgreSQL user names they can use, which
# databases they can access.  Records take one of these forms:
#
host my_database_name my_database_user 172.17.0.0/16 trust # Allowing docker container connections to host db
#
# local      DATABASE  USER  METHOD  [OPTIONS]
# host       DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
# hostssl    DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
# hostnossl  DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
```

Restart postgres and test your connection

`$  psql my_database_name my_database_user -h <host-ip-address>`

References:

https://stackoverflow.com/questions/31249112/allow-docker-container-to-connect-to-a-local-host-postgres-database

https://www.thegeekstuff.com/2014/02/enable-remote-postgresql-connection/
