#!/bin/sh
#VERSION=Template will replace and run the template version

LOCATION=/home/node/app
INFILE=$LOCATION/webpack.config.template.js
OUTFILE=$LOCATION/webpack.config.run.js

if [[ $VERSION == 'Template' ]]; then
    echo "Running the template version:"
    echo "    SERVER_PORT:   " + $SERVER_PORT;
    echo "    SERVER_HTTPS:  " + $SERVER_HTTPS;
    echo "    SERVER_HOST:   " + $SERVER_HOST;
    echo "    SERVER_PUBLIC: " + $SERVER_PUBLIC;
    echo "    PROXY_TARGET:  " + $PROXY_TARGET;
    CMD_SERVER_PORT="s/SERVER_PORT/${SERVER_PORT}/g"
    CMD_SERVER_HTTPS="s/SERVER_HTTPS/${SERVER_HTTPS}/g"
    CMD_SERVER_HOST="s/SERVER_HOST/${SERVER_HOST}/g"
    CMD_SERVER_PUBLIC="s/SERVER_PUBLIC/${SERVER_PUBLIC}/g"
    CMD_PROXY_TARGET="s/PROXY_TARGET/${PROXY_TARGET}/g"
    sed $CMD_PROXY_TARGET $INFILE | sed $CMD_SERVER_PORT | sed $CMD_SERVER_HTTPS | sed $CMD_SERVER_HOST | sed $CMD_SERVER_PUBLIC > $OUTFILE
    echo "<---------------------------------------->"
    cat $OUTFILE
    echo "<---------------------------------------->"
fi

npm run start$VERSION