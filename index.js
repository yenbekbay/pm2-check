#!/usr/bin/env /usr/local/bin/node

// <bitbar.title>PM2 Check</bitbar.title>
// <bitbar.version>v0.1.0</bitbar.version>
// <bitbar.author>Ayan Yenbekbay</bitbar.author>
// <bitbar.author.github>yenbekbay</bitbar.author.github>
// <bitbar.desc>Check the status of your PM2 processes</bitbar.desc>
// <bitbar.image>https://raw.githubusercontent.com/yenbekbay/pm2-check/master/demo.png</bitbar.image>
// <bitbar.dependencies>node.js</bitbar.dependencies>
// <bitbar.abouturl>https://github.com/yenbekbay/pm2-check</bitbar.abouturl>

'use strict';

const _ = require('lodash');
const bitbar = require('bitbar');
const exec = require('ssh-exec');
const isOnline = require('is-online');
const Rx = require('rx-lite');

const config = require('./config');

const bulletSymbol = '●';
const colors = {
  red: '#c91b00',
  green: '#00c200',
  yellow: '#c7c400'
};

isOnline((err, online) => {
  if (err || !online) {
    return bitbar([
      {
        text: bulletSymbol,
        color: colors.yellow,
        dropdown: false
      },
      bitbar.sep,
      {
        text: 'No internet connection'
      },
      bitbar.sep,
      {
        text: 'Refresh',
        refresh: true
      }
    ]);
  }

  Rx.Observable
    .zip(config.servers.map(({ name, user, host }) => Rx.Observable
      .fromNodeCallback(exec)('sudo pm2 list', { user, host })
      .map(([stdout, stderr]) => {
        const table = stdout.match(/┌((?!Module)(.|\s))*┘/)[0];

        const legendLine = table.match(/^│\sApp name.*/m)[0];
        const appLines = table.match(/^│\s(?!App name).*/gm);

        const legend = _(legendLine).split('│').map(_.trim).compact().value();
        const apps = appLines
          .map(line => _(line).split('│').map(_.trim).compact().value())
          .map(app => _.zipObject(legend, app));

        return [name].concat(apps.map(app => ({
          text: `- ${app['App name']} ●`,
          color: app.status === 'online' ? colors.green : colors.red
        })));
      })
    ))
    .subscribe(
      results => {
        const failingApp = _(results)
          .flatten()
          .filter(_.isObject)
          .find(['color', colors.red]);

        let output = [
          {
            text: bulletSymbol,
            color: failingApp ? colors.red : colors.green,
            dropdown: false
          }
        ];
        results.forEach(group => {
          output.push(bitbar.sep);
          output.push(...group);
        });
        output.push(bitbar.sep, {
          text: 'Refresh',
          refresh: true
        });

        bitbar(output);
      },
      err => {
        bitbar([
          {
            text: bulletSymbol,
            color: colors.red,
            dropdown: false
          },
          bitbar.sep,
          {
            text: err.message
          },
          bitbar.sep,
          {
            text: 'Refresh',
            refresh: true
          }
        ]);
      }
    );
});
