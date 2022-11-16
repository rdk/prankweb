# About

Prankweb online is a web frontend for [p2rank] a protein-ligand binding site prediction tool based on machine learning.

You can [run p2rank on your computer using Docker](https://github.com/cusbg/p2rank-framework/wiki/P2Rank-Deploy-Docker) that way you have access to the same functionality as prankweb.
Alternatively, you can run [p2rank without Docker](https://github.com/rdk/p2rank#setup) with limited functionality.  

More information about [p2rank] and prankweb can be found in the [wiki](https://github.com/cusbg/p2rank-framework/wiki).

## Run locally using Docker Compose
This section explains how you can start prankweb locally using docker compose.
For deployment, we use ```docker-compose.yaml``` 

Build containers:
```docker compose build```
Create mount for rabbitmq, predictions and conservation:
```
docker volume create --name prankweb_rabbitmq --opt type=none --opt device=/tmp/rabbitmq --opt o=bind
docker volume create --name prankweb_conservation --opt type=none --opt device=/tmp/conservation --opt o=bind
docker volume create --name prankweb_predictions --opt type=none --opt device=/tmp/predictions --opt o=bind
docker volume create --name prankweb_services --opt type=none --opt device=/tmp/services --opt o=bind
```
Please update the paths to the ```tmp``` directory to reflect your setup.

Download conservation file(s) using following command this may take a while.
```
docker compose run --rm executor python3 /opt/hmm-based-conservation/download_database.py```
```
Be aware that you need about 18&nbsp;GB of space to download the file(s).

Finally, you can start the application using:
```
docker compose up
```
You should be able to see the frontend at [localhost:8020](http://localhost:8020).

[p2rank]: <https://github.com/rdk/p2rank>
