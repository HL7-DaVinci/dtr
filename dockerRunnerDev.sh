#!/bin/sh

# Handle closing application on signal interrupt (ctrl + c)
trap 'kill $CONTINUOUS_INSTALL_PID $SERVER_PID; gradle --stop; exit' INT

mkdir logs 
# Reset log file content for new application boot
echo "*** Logs for continuous installer ***" > ./logs/installer.log
echo "*** Logs for 'npm run start' ***" > ./logs/runner.log

# Print that the application is starting in watch mode
echo "starting application in watch mode..."

# Start the continious build listener process
echo "starting continuous installer..."
npm install

( package_modify_time=$(stat -c %Y package.json)
package_lock_modify_time=$(stat -c %Y package-lock.json)
while sleep 1
do
    new_package_modify_time=$(stat -c %Y package.json)
    new_package_lock_modify_time=$(stat -c %Y package-lock.json)    
    
    if [[ "$package_modify_time" != "$new_package_modify_time" ]] || [[ "$package_lock_modify_time" != "$new_package_lock_modify_time" ]]
    then
        echo "running npm install..."
        npm install | tee ./logs/installer.log
    fi

    package_modify_time=$new_package_modify_time
    package_lock_modify_time=$new_package_lock_modify_time

done )  & CONTINUOUS_INSTALL_PID=$!

# Start server process once initial build finishes  
( npm run start | tee ./logs/runner.log ) & SERVER_PID=$!

# Handle application background process exiting
wait $CONTINUOUS_INSTALL_PID $SERVER_PID
EXIT_CODE=$?
echo "application exited with exit code $EXIT_CODE..."


