#!/bin/sh
#VERSION=Template will replace and run the template version

LOCATION=/home/node/app
INFILE=$LOCATION/webpack.config.template.js
OUTFILE=$LOCATION/webpack.config.run.js

if [[ $VERSION == 'Template' ]]; then
    echo "running the template version!"
    CMD_PROXY_TARGET="s/PROXY_TARGET/${PROXY_TARGET}/g"
    CMD_SERVER_PORT="s/SERVER_PORT/${SERVER_PORT}/g"
    CMD_SERVER_HTTPS="s/SERVER_HTTPS/${SERVER_HTTPS}/g"
    sed $CMD_PROXY_TARGET $INFILE | sed $CMD_SERVER_PORT | sed $CMD_SERVER_HTTPS > $OUTFILE
    echo "<---------------------------------------->"
    cat $OUTFILE
    echo "<---------------------------------------->"
fi

npm run start$VERSION