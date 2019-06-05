#!/bin/sh
#VERSION=Template will replace and run the template version


echo "hello: $SERVER"

LOCATION=/home/node/app
#LOCATION=.
INFILE=$LOCATION/webpack.config.template.js
OUTFILE=$LOCATION/webpack.config.run.js

if [[ $VERSION == 'Template' ]]; then
    echo "running the template version!"
    CMD1="s/PROXY_TARGET/${PROXY_TARGET}/g"
    CMD2="s/SERVER_PORT/${SERVER_PORT}/g"
    sed $CMD1 $INFILE | sed $CMD2 > $OUTFILE
    echo "<---------------------------------------->"
    cat $OUTFILE
    echo "<---------------------------------------->"
fi

npm run start$VERSION