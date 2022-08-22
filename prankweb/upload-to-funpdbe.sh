#!/bin/bash

echo "Enter password for p2rank:"
read PASS

HOST='ftp-private.ebi.ac.uk'
USER='p2rank'
TARGETFOLDER='/upload/'
SOURCEFOLDER='/data/prankweb/funpdbe/ftp/'

lftp -f "
open $HOST
user $USER $PASS
lcd $SOURCEFOLDER
mirror --reverse --delete --verbose $SOURCEFOLDER $TARGETFOLDER
bye
"

# Arguments for lftp mirror
# consider -only-newer download only newer files (-c won't work)
# and --dry-run to see the changes
#