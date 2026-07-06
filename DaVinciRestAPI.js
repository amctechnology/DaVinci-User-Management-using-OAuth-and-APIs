const https = require('https');
const { parse } = require('path');
const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
const davinciAuthUrl = 'oauth.contactcanvas.com';
const davinciApiUrl = 'api.contactcanvas.com';

/**
 * This enum represents the HTTP methods that can be used in a REST request
 *
 * @enum {string}
 */
const Method = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
};

initialize();

/**
 * This function will initialize the application
 *
 */
async function initialize() {
    try {
        const OAuth = await readFromJsonFile('./config.json');
        const cookie = await getCookie(OAuth);
        if (cookie == null) {
            throw error = 'Failed to get Access Token';
        }
        console.log('Successfully authenticated.');
        pickFunction(cookie);
    } catch (error) {
        console.log('Unable to Authenticate: \n');
        console.log(error);
        process.exit(1);
    }
}

/**
 * This function will get the access token from the DaVinci OAuth Service
 *
 * @param {*} OAuth JSON object containing the OAuth credentials
 * @return {string} returns the cookie from the DaVinci OAuth Service
 */
async function getCookie(OAuth) {
    const response = await sendRequest(Method.POST, davinciAuthUrl, '/v1/Auth', OAuth);
    for (let i = 0; i < response.headers.length; i++) {
        const header = response.headers[i];
        if (header.key == 'Set-Cookie') {
            for (let j = 0; j < header.value.length; j++) {
                const cookie = header.value[j];
                if (cookie.includes('access_token=')) {
                    return cookie;
                }
            }
        }
    }
    throw new Error('No access token found');
}

/**
 * This function will prompt the user to select a function to run
 *
 */
async function pickFunction(cookie) {
    try {
        const input = await readLineHandler(
            'What do you want to do?' +
            '\n(1) Export users' +
            '\n(2) Import users' +
            '\n(3) Delete Users' +
            '\n(4) Create New User' +
            '\n(5) Exit\n'
        );
        switch (input) {
            case '1':
                await exportUsers(cookie);
                break;
            case '2':
                await importUsers(cookie);
                break;
            case '3':
                await deleteUsers(cookie);
                break;
            case '4':
                await createUser(cookie);
                break;
            case '5':
                process.exit(0);
            default:
                console.log('Invalid input');
                break;
        }
    } catch (error) {
        console.log('Failed to execute operation: \n');
        console.log(error);
    } finally {
        pickFunction(cookie);
    }
}

/**
 * This function will prompt the user for input and wait for the input before returning
 *
 * @param {string} question
 * @return {string} input from user
 */
async function readLineHandler(question) {
    return await new Promise((resolve, reject) => {
        readline.question(question, (input) => {
            resolve(input);
        });
    });
}

/**
 * This function handles sending the REST requests to the DaVinci API
 *
 * @param {Method} method HTTP method to be used in the request
 * @param {string} host api.contactcanvas.com
 * @param {string} path Endpoint on the DaVinci API to be hit
 * @param {*} payload JSON object to be sent in the request
 * @param {string} cookie Authentication cookie from DaVinci OAuth Service
 * @return {*} response body
 */
async function sendRequest(method, host, path, payload, cookie) {
    return await new Promise((resolve, reject) => {
        headers = {};
        let contentType = 'application/json';

        headers['Content-Type'] = contentType;
        if (cookie != null) {
            headers['Cookie'] = cookie;
        }

        const options = {
            hostname: host,
            path: path != null ? path : '/',
            method: method != null ? method : Method.GET,
            headers: headers
        };
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('error', (error) => {
                reject(error);
            });

            res.on('end', () => {
                resolve(JSON.parse(data? data : '{}'));
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify(payload), (err) => {
            if (err) {
                reject(err);
            }
        });

        req.end();
    });
}

/**
 * This function will write a JSON object to a file
 *
 * @param {*} data JSON object to be written to file
 * @param {string} fileName of the file to be written to
 */
async function writeToJsonFile(data, fileName) {
    const fs = require('fs');
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2), (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });
}

/**
 * This function will read a JSON file and return the body of the file
 *
 * @param {string} fileName of the JSON file to be read
 * @return {*} body of the JSON file
 */
async function readFromJsonFile(fileName) {
    const fs = require('fs');
    const fileContent = fs.readFileSync(fileName, 'utf8');
    return JSON.parse(fileContent);
}

/**
 * This function will export users from the DaVinci API and write them to a JSON file
 *
 * @param {string} cookie
 * @return {User[]} response body
 */
async function exportUsers(cookie) {
    /**@type {User[]}*/
    const users = await sendRequest(Method.GET, davinciApiUrl, '/v1/api/user', null, cookie);
    console.log(JSON.stringify(users));
    await writeToJsonFile(users, 'users/exportUsers.json');
    return users;
}

/**
 * This function will import users from a JSON file to the DaVinci API
 *
 * @param {string} cookie
 * @return {*} list of usernames of users that failed to be imported
 */
async function importUsers(cookie) {
    /**@type {User[]}*/
    const users = await readFromJsonFile('users/importUsers.json');
    console.log(JSON.stringify(users));
    const newUsersWithoutLicense = users
        .filter(user => (user.hasLicense === false || user.hasLicense == null) && !user.userid)
        .map(user => user.username);
    
    let response = await sendRequest(Method.PUT, davinciApiUrl, '/v3/api/user/ImportUsers', users, cookie);
    response = parseImportResponse(response, newUsersWithoutLicense);
    console.log(JSON.stringify(response));
    return response;
}

/**
 * This function will delete users from the DaVinci API using a JSON file
 *
 * @param {string} cookie
 * @return {*} list of ids of users that failed to be deleted
 */
async function deleteUsers(cookie) {
    const users = await readFromJsonFile('users/deleteUsers.json');
    console.log(JSON.stringify(users));
    const response = await sendRequest(Method.POST, davinciApiUrl, '/v1/api/user/DeleteUsers', users, cookie);
    console.log(JSON.stringify(response));
    return response;
}

/**
 * This function will create a new user in the DaVinci API
 *
 * @param {string} cookie
 * @return {*} response body
 */
async function createUser(cookie) {
    /**@type {User}*/
    let user = await createUserObject();
    // Determine if this new user should have license removal failures ignored
    // New users without hasLicense=true should not trigger license removal errors
    // Use email as the unique identifier (falls back to username if email is not set)
    const usersWithoutLicenseAttempted = (user.hasLicense === false || user.hasLicense == null) 
        ? [(user.email || user.username || '').toLowerCase()] 
        : [];
    let response = await sendRequest(Method.PUT, davinciApiUrl, '/v3/api/user/ImportUsers', [user], cookie);
    response = parseImportResponse(response, usersWithoutLicenseAttempted);
    console.log(JSON.stringify(response));
    return response;
}

/**
 * Creates a new user object either from user input or from the parameters
 *
 * @param {*} [username=null] Username of the user
 * @param {*} [profileid=null] Id of the profile to be assigned to the user
 * @param {*} [profilename=null] Name of the profile to be assigned to the user
 * @return {user} user object
 */
async function createUserObject(username = null, profileid = null, profilename = null) {
    let user = {};
    user.username = username ? username : await readLineHandler('Enter username: ');
    user.email = user.username;
    user.profileid = profileid ? profileid : await readLineHandler('Enter profileid: ');
    user.profilename = profilename ? profilename : await readLineHandler('Enter profilename: ');
    user.isActive = true;
    user.roleid = 'd5fa771f-11a2-73af-a5fe-91f42c06e709'; // Default role is Agent
    user.accountid = '00000000-0000-0000-0000-000000000000'; // User will automatically be assigned to the account as the OAuth Credentials
    user.accountname = 'Default';
    if (typeof hasLicense === 'boolean') {
        user.hasLicense = hasLicense;
    } else {
        const licenseAnswer = await readLineHandler('Assign a license to this user? (y/n): ');
        const normalized = (licenseAnswer || '').trim().toLowerCase();
        user.hasLicense = (normalized === 'y' || normalized === 'yes' || normalized === '1' || normalized === 'true') ? true : false;
    }
    user.profiles = [
        {
            profileid: user.profileid,
            profilename: user.profilename,
            userid: '00000000-0000-0000-0000-000000000000',
        }
    ];
    user.loglevel = 100;
    user.profilesJson = JSON.stringify(user.profiles);
    user.lastLoginTime = new Date().toISOString();
    user.logModifiedDate = new Date().toISOString();
    console.log(JSON.stringify(user));
    return user;
}


/**
 * Formats the response from the DaVinci API after a user import or user create.
 * Removes false license removal failures for new users that were created without a license.
 *
 * @param {*} response Response from the DaVinci API after a user import or user create operation.
 * @param {string[]} usersWithoutLicenseAttempted Array of emails (lowercase) for new users that should not have license removal failures.
 * @return {*} Formatted response with corrected error counts and filtered license removal failures.
 */
function parseImportResponse(response, usersWithoutLicenseAttempted = []) {
    if (!response || !usersWithoutLicenseAttempted || usersWithoutLicenseAttempted.length === 0) {
        return response;
    }

    const isUserInList = (identifier) => {
        if (!identifier) {
            return false;
        } else {
            return usersWithoutLicenseAttempted.includes(identifier.toLowerCase());
        }
    };

    if (response.licenseRemovalFailures) {
        const originalFailureCount = response.licenseRemovalFailures.length;
        response.licenseRemovalFailures = response.licenseRemovalFailures.filter(
            failedIdentifier => !isUserInList(failedIdentifier)
        );
        const removedCount = originalFailureCount - response.licenseRemovalFailures.length;
        
        if (response.totalErrors && removedCount > 0) {
            response.totalErrors = Math.max(0, response.totalErrors - removedCount);
        }
    }

    if (response.results) {
        response.results = response.results.filter(result => {
            const userIdentifier = result.email || result.username;
            if (isUserInList(userIdentifier) && 
                result.errorMessage && 
                result.errorMessage.includes('Unable to remove license')) {
                return false;
            }
            return true;
        });
    }

    return response;
}

/**
 * This defines a single profile that is assigned to a user
 *
 * @typedef {Object} Profile
 * @property {string} profileid Id of the profile
 * @property {string} profilename Name of the profile
 * @property {string} userid Id of the user the profile is assigned to
 */

/**
 * This defines a single user from the DaVinci API
 *
 * @typedef {Object} User
 * @property {number} loglevel 0 = Loop, 1 = Trace, 2 = Debug, 3 = Info, 4 = Warn, 5 = Error, 6 = Critical, 100 = None
 * @property {string?} userid When creating a new user this field is null
 * @property {string?} username
 * @property {string?} firstName
 * @property {string?} lastName
 * @property {string} email
 * @property {string?} password
 * @property {boolean} isActive
 * @property {string} roleid Admin = '413f59a5-6354-116b-3b3e-0a94f94ea000', Agent = 'd5fa771f-11a2-73af-a5fe-91f42c06e709', No-Access = 'e3759ee3-6add-ad4c-e970-4a5c7be32c1f'
 * @property {string} rolename Admin, Agent, No-Access
 * @property {string} accountid
 * @property {string} accountname
 * @property {string?} originalAccountid
 * @property {string} profileid Id of Default profile for a user
 * @property {string} profilename Name of Default profile for a user
 * @property {string?} customerid
 * @property {boolean} hasLicense true if user has a license
 * @property {string} lastLoginTime
 * @property {string?} attributes custom attributes for a user
 * @property {Profile[]} profiles Array of profiles assigned to a user
 * @property {string} profilesJson
 * @property {string} logModifiedDate
 */