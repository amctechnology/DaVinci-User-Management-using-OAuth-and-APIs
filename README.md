# AMC Technology DaVinci REST API

## Introduction

This project is a an example of how to access the DaVinci REST API via a HTTP requests. This project uses Node.js to run a script that can *Import, Export, and Delete* users in DaVinci. This project is not intended to be used in a production environment, but rather as a starting point for developers to build their own applications. The script is written in JavaScript and the file is documented using JSDoc. There are two types declared using JSDoc in the file `User` and `Profile`. These are the attributes of users that are used for importing and exporting users.

## Getting Started

Log into Creators Studio and navigate to the REST Keys tab. Generate a new ClientId and ClientSecret. Create a `config.json` file based on the `configExample.json` file. Copy the ClientId and ClientSecret values into the `config.json` file. Keep these credentials in a secure location as they are used to authenticate with the DaVinci REST API. There are examples of what the files in the `users` sub directory should look like in the `users` sub directory. The script will autogenerate the `exportUsers.json` file when an export operation is executed. The `importUsers.json` and `deleteUsers.json` files will have to be manually created based on the examples.

## Running the Script

To run the script, you must have Node.js installed on your machine. Navigate to the project directory and run the following command:

>npm install

Then run the following command to start the CLI script:

>node DaVinciRestAPI.js

## Using the Script

The script will prompt you to select an action. You can select one of the following actions:

1. Export Users
2. Import Users
3. Delete Users
4. Create New User
5. Exit

### Export Users

This action will export all users from the account to the `exportUsers.json` file. This file will be created in the `users` sub directory of the project directory. The file will be overwritten each time this action is run. Note that the export users action does not return user objects correctly reflecting the hasLicense property value.

### Import Users

This action will import users from the `importUsers.json` file. This file must be located in the `users` sub directory of the project directory. The file must be in the same format as the `exportUsers.json` file.
If you want to create a new user the userid field needs to be null or undefined and the username and email cannot already have been used to create a user. Note that license assignment and removal is supported for the existing/new user import action using the hasLicense property that is present on each user object in the import json file. License assignment will fail when assigning a license to an existing user who already has one and license removal will fail when removing a license from an existing user who does not yet have one assigned. If no changes to the existing user's license status are required you may set the hasLicense property to null.

### Delete Users

This action will delete users from the `deleteUsers.json` file. This file must be located in the `users` sub directory of the project directory. The file is just an array of the user ids that you want to delete.

### Create New User

This action will prompt the user to enter the username, profileId, profilename, and whether the new user being created should be assigned a license. The profileId must be from a valid profile in the account and the username you provide must not already exist as a user under your Creators Studio account. Note that for license assignment to succeed you must have enough available licenses under your DaVinci Creators Studio account/subscription. In this scenario the new users you import will still be created, but no licenses will be applied.

### Exit

This action will exit the script.
