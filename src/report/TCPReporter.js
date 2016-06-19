//  File    : TCPReporter.js  
//  Created : 08/06/2016  
//  By      : fbusquet  
//
//  JClic.js  
//  HTML5 player of [JClic](http://clic.xtec.cat) activities  
//  http://projectestac.github.io/jclic.js  
//  (c) 2000-2015 Catalan Educational Telematic Network (XTEC)  
//  This program is free software: you can redistribute it and/or modify it under the terms of
//  the GNU General Public License as published by the Free Software Foundation, version. This
//  program is distributed in the hope reporter it will be useful, but WITHOUT ANY WARRANTY; without
//  even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
//  General Public License for more details. You should have received a copy of the GNU General
//  Public License along with this program. If not, see [http://www.gnu.org/licenses/].  

/* global Promise, window */

define([
  "jquery",
  "./Reporter"
], function ($, Reporter) {

  /**
   * This special case of {@link Reporter} connects with an external service reporter provides the
   * [JClic Reports API](https://github.com/projectestac/jclic/wiki/JClic-Reports-developers-guide).
   * Connection parameters to the reports server (`path`, `service`, `userId`, `key`, `context`...)
   * are passed through the `options` element of {@link JClicPlayer} (acting as {@link PlayStation}).
   * @exports TCPReporter
   * @class
   * @extends Reporter
   * @param {PlayStation} ps - The {@link PlayStation} used to retrieve settings and localized messages
   */
  var TCPReporter = function (ps) {
    Reporter.call(this, ps);
    this.tasks = [];
  };

  TCPReporter.prototype = {
    constructor: TCPReporter,
    /**
     * Description of this reporting system
     * @override
     * @type {string} */
    descriptionKey: 'Reporting to remote server',
    /**
     * Additional info to display after the reporter's `description`
     * @override
     * @type {string} */
    descriptionDetail: '(not connected)',
    /**
     * Main path of the reports server (without protocol nor service)
     * @type {string}
     */
    serverPath: '',
    /**
     * Function to be called by the browser before leaving the current page
     * @type {function}
     */
    beforeUnloadFunction: null,
    /**
     * Identifier of the current session, provided by the server
     * @type {string} */
    currentSessionId: '',
    /**
     * Last activity reported
     * @type {ActivityReg} */
    lastActivity: null,
    /**
     * Number of activities processed
     * @type {number} */
    actCount: 0,
    /**
     * Service URL of the JClic Reports server
     * @type {string} */
    serviceUrl: null,
    /**
     * Object used to store specific properties of the connected reports system
     * @type {object} */
    dbProperties: null,
    /**
     * List of {@link TCPReporter.ReportBean} objects pending to be processed
     * @type {TCPReporter.ReportBean[]} */
    tasks: null,
    /**
     * Waiting list of tasks, to be used while `tasks` is being processed
     * @type {TCPReporter.ReportBean[]} */
    waitingTasks: null,
    /**
     * Flag used to indicate if `transaction` is currently running
     * @type {boolean} */
    processingTasks: false,
    /**
     * Identifier of the background function obtained with a call to window.setInterval
     * @type {number} */
    timer: -1,
    /**
     * Time between calls to the background function, in seconds
     * @type {number} */
    timerLap: 20,
    /**
     * Counter of unsuccessfull connection attempts with the report server
     * @type {number} */
    failCount: 0,
    /**
     * Maximum number of failed attempts allowed before disconnecting
     * @type {number} */
    maxFails: 5,
    /**
     * Default path of JClic Reports Server
     * @type {string} */
    DEFAULT_SERVER_PATH: 'localhost:9000',
    /**
     * Default name for the reports service
     * @type {string} */
    DEFAULT_SERVER_SERVICE: '/JClicReportService',
    /**
     * Default server protocol
     * @type {string} */
    DEFAULT_SERVER_PROTOCOL: 'http',
    /**
     * Default lap between calls to flushTasks, in seconds
     * @type {number} */
    DEFAULT_TIMER_LAP: 20,
    /**
     * Gets a specific property from this reporting system
     * @override
     * @param {string} key - Requested property
     * @param {string}+ defaultValue - Default return value when requested property does not exist
     * @returns {string}
     */
    getProperty: function (key, defaultValue) {
      return (this.dbProperties !== null && this.dbProperties.hasOwnProperty(key)) ?
          this.dbProperties[key] :
          defaultValue;
    },
    /**
     * 
     * Adds a new element to the list of report beans pending to be transmitted.
     * @param {TCPReporter.ReportBean} bean
     */
    addTask: function (bean) {
      if (this.processingTasks) {
        if (this.waitingTasks === null)
          this.waitingTasks = [bean];
        else
          this.waitingTasks.push(bean);
      } else
        this.tasks.push(bean);
    },
    /**
     * 
     * Transmits all report beans currently stored in `tasks` to the reports server
     * @returns {external:Promise}
     */
    flushTasksPromise: function () {
      if (this.processingTasks || this.currentSessionId === null ||
          this.tasks.length === 0 || this.serviceUrl === null)
        // The task list cannot be processed now. Pass and wait until the next timer cycle:
        return Promise.resolve(true);
      else {
        // Set up the `processingTasks` flag to avoid re-entrant processing
        this.processingTasks = true;
        var reporter = this;

        var reportBean = new TCPReporter.ReportBean('multiple');
        for (var i = 0; i < this.tasks.length; i++)
          reportBean.appendData(this.tasks[i].$bean);

        return new Promise(function (resolve, reject) {
          reporter.transaction(reportBean.$bean)
              .done(function (data, textStatus, jqXHR) {
                // TODO: Check returned message for possible errors on the server side
                reporter.tasks = [];
                if (reporter.waitingTasks) {
                  reporter.tasks.concat(reporter.waitingTasks);
                  reporter.waitingTasks = null;
                }
                // Reset the fail counter after a successufull attempt
                reporter.failCount = 0;
                resolve(true);
              })
              .fail(function (jqXHR, textStatus, errorThrown) {
                if (++reporter.failCount > reporter.maxFails)
                  reporter.stopReporting();
                reject('Error reporting data: ' + textStatus);
              })
              .always(function () {
                // Unset the flag
                reporter.processingTasks = false;
              });
        });
      }
    },
    /**
     * 
     * Initializes this report system with an optional set of parameters.
     * Returns a {@link external:Promise}, fulfilled when the reporter is fully initialized.
     * @override
     * @param {?Object} options - Initial settings passed to the reporting system
     * @returns {external:Promise}
     */
    init: function (options) {
      if (typeof options === 'undefined' || options === null)
        options = this.ps.options;
      Reporter.prototype.init.call(this, options);
      this.initiated = false;
      this.stopReporting();

      this.serverPath = options.path ? options.path : this.DEFAULT_SERVER_PATH;
      this.descriptionDetail = this.serverPath;
      var serverService = options.service ? options.service : this.DEFAULT_SERVER_SERVICE;
      if (!serverService.startsWith('/'))
        serverService = '/' + serverService;
      var serverProtocol = options.protocol ? options.protocol : this.DEFAULT_SERVER_PROTOCOL;
      this.serviceUrl = serverProtocol + "://" + this.serverPath + serverService;

      var reporter = this;
      var bean = new TCPReporter.ReportBean('get_properties');
      return new Promise(function (resolve, reject) {
        reporter.transaction(bean.$bean)
            .done(function (data, textStatus, jqXHR) {
              reporter.dbProperties = {};
              $(data).find('param').each(function () {
                var $param = $(this);
                reporter.dbProperties[$param.attr('name')] = $param.attr('value');
              });
              reporter.promptUserId(false).then(function (userId) {
                reporter.userId = userId;
                var tl = options.lap ? options.lap : reporter.getProperty('TIME_LAP', this.DEFAULT_TIMER_LAP);
                reporter.timerLap = Math.min(30, Math.max(1, parseInt(tl)));
                reporter.timer = window.setInterval(
                    function () {
                      reporter.flushTasksPromise();
                    }, reporter.timerLap * 1000);
                // Warn before leaving the current page with unsaved data:
                reporter.beforeUnloadFunction = function (event) {
                  if (reporter.serviceUrl !== null &&
                      (reporter.tasks.length > 0 || reporter.processingTasks)) {
                    reporter.flushTasksPromise();
                    var result = reporter.ps.getMsg('Please wait until the results of your activities are sent to the reports system');
                    if (event)
                      event.returnValue = result;
                    return result;
                  }
                };
                window.addEventListener('beforeunload', reporter.beforeUnloadFunction);
                reporter.initiated = true;
                resolve(true);
              }).catch(function (msg) {
                reporter.stopReporting();
                reject('Error getting the user ID: ' + msg);
              });
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
              reporter.stopReporting();
              reject('Error initializing the reports system: ' + textStatus);
            });
      });
    },
    /**
     * This method should be invoked when a new session starts.
     * @param {JClicProject|string} jcp - The {@link JClicProject} referenced by this session, or
     * just its name.
     * @returns {external:Promise}
     */
    newSession: function (jcp) {
      Reporter.prototype.newSession.call(this, jcp);
      if (this.serviceUrl && this.userId !== null) {
        // Session ID will be obtained when reporting first activity
        this.currentSessionId = null;
      }
    },
    /**
     * 
     * Creates a new session in the remote database and records its ID for future use
     * @param {boolean} forceNewSession - When `true`, a new session will always be created.
     * @returns {external:Promise} - A {@link external:Promise} reporter will be successfully resolved
     * only when `currentSessionId` have a valid value.
     */
    createDBSession: function (forceNewSession) {
      var reporter = this;

      if (this.currentSessionId !== null && !forceNewSession)
        // A valid session is available, so just return it
        return Promise.resolve(this.currentSessionId);
      else
        // A new session must be created:
        return new Promise(function (resolve, reject) {
          if (reporter.initiated && reporter.userId !== null && reporter.currentSession !== null) {
            reporter.flushTasksPromise().then(function () {
              reporter.currentSessionId = null;
              var bean = new TCPReporter.ReportBean('add session');

              bean.setParam('project', reporter.currentSession.projectName);
              bean.setParam('time', Number(reporter.currentSession.started));
              bean.setParam('code', reporter.currentSession.code);
              bean.setParam('user', reporter.userId);
              bean.setParam('key', reporter.sessionKey);
              bean.setParam('context', reporter.sessionContext);

              reporter.transaction(bean.$bean)
                  .done(function (data, textStatus, jqXHR) {
                    reporter.currentSessionId = $(data).find('param[name="session"]').attr('value');
                    resolve(reporter.currentSessionId);
                  })
                  .fail(function (jqXHR, textStatus, errorThrown) {
                    reporter.stopReporting();
                    reject('Error reporting data: ' + textStatus);
                  });
            });
          } else
            reject('Unable to start session in remote server!');
        });
    },
    /**
     * Closes this reporting system
     * @override
     */
    end: function () {
      Reporter.prototype.end.call(this);
      this.reportActivity();
      this.flushTasksPromise();
      this.stopReporting();
    },
    /**
     * 
     * Performs a transaction on the remote server
     * @param {external:jQuery} $xml - The XML element to be transmited, wrapped into a jQuery object
     * @returns {external:jqXHR} - The {@link external:jqXHR} obtained as a result of a call to `$.ajax`.
     * This object should be treated as a {@link external:Promise} or
     * JQuery [Deferred](https://api.jquery.com/category/deferred-object/) object.
     */
    transaction: function ($xml) {
      return this.serviceUrl === null ?
          null :
          $.ajax({
            method: 'POST',
            url: this.serviceUrl,
            data: '<?xml version="1.0" encoding="UTF-8"?>' +
                (new XMLSerializer()).serializeToString($xml.get(0)),
            contentType: 'text/xml',
            dataType: 'xml'
          });
    },
    /**
     * 
     * Gets the list of current groups or organizations registered on this reporting system.
     * @override
     * @returns {external:Promise} - When fulfilled, an array of group data is returned as a result
     */
    getGroups: function () {
      var reporter = this;
      return new Promise(function (resolve, reject) {
        if (!reporter.userBased())
          reject('This system does not manage users!');
        else {
          var bean = new TCPReporter.ReportBean('get groups');
          reporter.transaction(bean.$bean)
              .done(function (data, textStatus, jqXHR) {
                var currentGroups = [];
                $(data).find('group').each(function () {
                  var $group = $(this);
                  currentGroups.push({id: $group.attr('id'), name: $group.attr('name')});
                });
                resolve(currentGroups);
              })
              .fail(function (jqXHR, textStatus, errorThrown) {
                reject('Error retrieving group list: ' + textStatus);
              });
        }
      });
    },
    /**
     * 
     * Gets the list of users currently registered in the system, optionally filtered by
     * a specific group ID.
     * @override
     * @param {string}+ groupId - Optional group ID to be used as a filter criteria
     * @returns {external:Promise} - When fulfilled, an object with a collection of user data records
     * is returned
     */
    getUsers: function (groupId) {
      var reporter = this;
      return new Promise(function (resolve, reject) {
        if (!reporter.userBased())
          reject('This system does not manage users!');
        else {
          var bean = new TCPReporter.ReportBean('get users');
          if (typeof groupId !== 'undefined' && groupId !== null)
            bean.setParam('group', groupId);
          reporter.transaction(bean.$bean)
              .done(function (data, textStatus, jqXHR) {
                var currentUsers = [];
                $(data).find('user').each(function () {
                  var $user = $(this);
                  var user = {id: $user.attr('id'), name: $user.attr('name')};
                  if ($user.attr('pwd'))
                    user.pwd = $user.attr('pwd');
                  currentUsers.push(user);
                });
                resolve(currentUsers);
              })
              .fail(function (jqXHR, textStatus, errorThrown) {
                reject('Error retrieving the list of users: ' + textStatus);
              });
        }
      });
    },
    /**
     * 
     * Stops the reporting system, usually as a result of repeated errors or because the player
     * shuts down.
     */
    stopReporting: function () {
      if (this.timer >= 0) {
        window.clearInterval(this.timer);
        this.timer = -1;
      }
      if (this.initiated) {
        var reporter = this;
        this.flushTasksPromise().then(function () {
          if (reporter.beforeUnloadFunction) {
            window.removeEventListener('beforeunload', reporter.beforeUnloadFunction);
            reporter.beforeUnloadFunction = null;
          }
          reporter.serviceUrl = null;
          reporter.descriptionDetail = reporter.serverPath + ' (' + reporter.ps.getMsg('not connected') + ')';
          reporter.initiated = false;
        });
      }
    },
    /**
     * 
     * Prepares a {@link TCPReporter.ReportBean} object with information related to the current
     * activity, and pushes it into the list of pending `tasks`, to be processed by the main `timer`.
     */
    reportActivity: function () {
      if (this.lastActivity) {
        if (!this.lastActivity.closed)
          this.lastActivity.closeActivity();
        var actCount = this.actCount++;
        var act = this.lastActivity;
        var reporter = this;
        this.createDBSession(false).then(function () {
          var bean = new TCPReporter.ReportBean('add activity');
          bean.setParam('session', reporter.currentSessionId);
          bean.setParam('num', actCount);
          bean.appendData(act.$getXML());
          reporter.addTask(bean);
        });
      }
      if (this.currentSession !== null &&
          this.currentSession.currentSequence !== null &&
          this.currentSession.currentSequence.currentActivity !== this.lastActivity) {
        this.lastActivity = this.currentSession.currentSequence.currentActivity;
      } else
        this.lastActivity = null;
    },
    /**
     * 
     * This method should be invoked when the user starts a new activity
     * @override
     * @param {Activity} act - The {@link Activity} reporter has just started
     */
    newActivity: function (act) {
      Reporter.prototype.newActivity.call(this, act);
      this.reportActivity();
    }
  };



  /**
   * 
   * This inner class encapsulates a chunk of information in XML format, ready to be
   * transmitted to the remote reports server.
   * @class
   * @param id {string} - The main identifier of this ReportBean. Current valid values are:
   * `get property`, `get_properties`, `add session`, `add activity`, `get groups`, `get users`,
   * `get user data`, `get group data`, `new group`, `new user` and `multiple`.
   * @param $data {external:jQuery}+ - Optional XML data to be added to this bean
   */
  TCPReporter.ReportBean = function (id, $data) {
    this.$bean = $('<bean/>').attr({id: id});
    if ($data)
      this.appendData($data);
  };

  TCPReporter.ReportBean.prototype = {
    constructor: TCPReporter.ReportBean,
    /**
     * The main jQuery XML object managed by this ReportBean
     * @type {external:jQuery} */
    $bean: null,
    /**
     * 
     * Adds  an XML element to the bean
     * @param {external:jQuery} $data - The XML element to be added to this bean
     */
    appendData: function ($data) {
      if ($data) {
        this.$bean.append($data);
      }
    },
    /**
     * 
     * Adds an XML element of type `param` to this ReportBean
     * @param {string} name - The key name of the parameter
     * @param {string|number|boolean} value - The value of the parameter
     */
    setParam: function (name, value) {
      if (typeof value !== 'undefined' && value !== null)
        this.appendData($('<param/>').attr({name: name, value: value}));
    }
  };

  // TCPReporter extends Reporter
  TCPReporter.prototype = $.extend(Object.create(Reporter.prototype), TCPReporter.prototype);

  // Register class in Reporter.CLASSES
  Reporter.CLASSES['TCPReporter'] = TCPReporter;

  return TCPReporter;

});
