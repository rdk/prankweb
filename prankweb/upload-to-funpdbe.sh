#!/bin/bash

echo "Enter password for p2rank:"
read PASS

HOST='ftp-private.ebi.ac.uk'
USER='p2rank'
TARGETFOLDER='/upload/'
SOURCEFOLDER='/data/prankweb/funpdbe/ftp'

lftp -f "
open $HOST
user $USER $PASS
lcd $SOURCEFOLDER
mirror --reverse --delete --verbose $SOURCEFOLDER $TARGETFOLDER
bye
"