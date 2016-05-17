//  File    : Reporter.js  
//  Created : 17/05/2016  
//  By      : fbusquet  
//
//  JClic.js  
//  HTML5 player of [JClic](http://clic.xtec.cat) activities  
//  http://projectestac.github.io/jclic.js  
//  (c) 2000-2015 Catalan Educational Telematic Network (XTEC)  
//  This program is free software: you can redistribute it and/or modify it under the terms of
//  the GNU General Public License as published by the Free Software Foundation, version. This
//  program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
//  even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
//  General Public License for more details. You should have received a copy of the GNU General
//  Public License along with this program. If not, see [http://www.gnu.org/licenses/].  

define([
  "./SessionReg"
], function (SessionReg) {

  /**
   * This class implements the basic operations related with the processing of times and scores
   * done by users playing JClic activities. These operations include
   * users identification, compilation of data coming from the activities, storage of
   * this data for later use, and presentation of summarized results.
   * @exports Reporter
   * @class
   */
  var Reporter = function () {
    this.sessions = [];
    this.started = new Date();
    this.initiated = false;
  };

  Reporter.prototype = {
    constructor: Reporter,
    /**
     * User ID currently associated to this reporting system
     * @type {string} */
    userId: null,
    /**
     * Optional key to be added as a field of session records
     * @type {string} */
    sessionKey: null,
    /**
     * A second optional key to be reported as a field of session records
     * @type {string} */
    sessionContext: null,
    /**
     * Optional filter to be used in group selection dialog
     * @type {string} */
    groupCodeFilter: null,
    /**
     * Optional filter to be used in user selection dialog
     * @type {string} */
    userCodeFilter: null,
    /**
     * Details about this report system
     * @type {string} */
    description: 'Results are currently not been registered in any database',
    /**
     * Starting date and time of this Reporter
     * @type {Date} */
    started: null,
    /**
     * Array of registered sessions
     * @type {SessionReg[]} */
    sessions: [],
    /**
     * Currently active session
     * @type {SessionReg} */
    currentSession: null,
    /**
     * `true` if the system was successfully initiated, `false` otherwise
     * @type {boolean} */
    initiated: false,
    /**
     * `true` if the system is connected to a database with user's data.
     * When `false`, a generic ID will be used. */
    bUserBased: null,
    getProperty: function (key, defaultValue) {
      return defaultValue;
    },
    getBooleanProperty: function (key, defaultValue) {
      var s = getProperty(key, defaultValue === true ? 'true' : 'false');
      return key === null ? defaultValue : s === 'true' ? true : false;
    },
    getGroups: function () {
      return null;
    },
    getUsers: function (groupId) {
      return null;
    },
    getUserData: function (userId) {
      return null;
    },
    getGroupData: function (groupId) {
      return null;
    },
    userBased: function () {
      if (this.bUserBased === null)
        this.bUserBased = this.getBooleanProperty('USER_TABLES', true);
      return this.bUserBased;
    },
    promptForNewGroup: function () {
      // TODO: Implement promptForNewGroup
      return null;
    },
    promptForNewUser: function () {
      // TODO: Implement promptForNewUser
      return null;
    },
    promptGroupId: function () {
      // TODO: Implement promptGroupId
      return null;
    },
    promptUserId: function () {
      // TODO: Implement promptUserId
      return null;
    },
    toHtmlString: function () {
      // TODO: Implement toHtmlString
      return '';
    },
    init: function (properties) {
      this.userId = properties.hasOwnProperty('user') ? properties.user : null;
      this.sessionKey = properties.hasOwnProperty('key') ? properties.key : null;
      this.sessionContext = properties.hasOwnProperty('context') ? properties.key : null;
      this.groupCodeFilter = properties.hasOwnProperty('groupCodeFilter') ? properties.key : null;
      this.userCodeFilter = properties.hasOwnProperty('userCodeFilter') ? properties.key : null;
      this.initiated = true;
    },
    end: function () {
      this.endSession();
    },
    endSequence: function () {
      if (this.currentSession)
        this.currentSession.endSequence();
    },
    endSession: function () {
      this.endSequence();
      this.currentSession = null;
    },
    newGroup: function (gd) {
      throw "No database!";
    },
    newUser: function (ud) {
      throw "No database!";
    },
    newSession: function (jcp) {
      this.endSession();
      this.currentSession = new SessionReg(jcp);
      this.sessions.push(this.currentSession);
    },
    newSequence: function (ase) {
      if (this.currentSession)
        this.currentSession.newSequence(ase);
    },
    newActivity: function (act) {
      if (this.currentSession)
        this.currentSession.newActivity(act);
    },
    endActivity: function (score, numActions, solved) {
      if (this.currentSession)
        this.currentSession.endActivity(score, numActions, solved);
    },
    newAction: function (type, source, dest, ok) {
      if (this.currentSession)
        this.currentSession.newAction(type, source, dest, ok);
    },
    getCurrentSequenceInfo: function () {
      return this.currentSession === null ? null : this.currentSession.getCurrentSequenceInfo();
    },
    getCurrentSequenceTag: function () {
      return this.currentSession === null ? null : this.currentSession.getCurrentSequenceTag();
    }
  };

  /**
   * List of classes derived from Reporter. It should be filled by Reporter classes at declaration time.
   * @type {Object}
   */
  Reporter.CLASSES = {'Reporter': Reporter};

  Reporter.getReporter = function (className, properties) {
    var result = null;
    if (className === null) {
      className = 'Reporter';
      if (properties.hasOwnProperty('reporter'))
        className = properties.reporter;
    }
    if (Reporter.CLASSES.hasOwnProperty(className)) {
      result = new Reporter.CLASSES[className]();
      // TODO: Group reporter params into a single Object (as `reporterParams` in JClic)?
      if (properties)
        result.init(properties);
    }
    return result;
  };

  return Reporter;

});
