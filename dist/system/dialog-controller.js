'use strict';

System.register(['./lifecycle', './dialog-result', './dialog-cancel-error'], function (_export, _context) {
  "use strict";

  var invokeLifecycle, DialogResult, DialogCancelError, DialogController;

  

  return {
    setters: [function (_lifecycle) {
      invokeLifecycle = _lifecycle.invokeLifecycle;
    }, function (_dialogResult) {
      DialogResult = _dialogResult.DialogResult;
    }, function (_dialogCancelError) {
      DialogCancelError = _dialogCancelError.DialogCancelError;
    }],
    execute: function () {
      _export('DialogController', DialogController = function () {
        function DialogController(renderer, settings, resolve, reject) {
          

          this.renderer = renderer;
          this.settings = settings;
          this._resolve = resolve;
          this._reject = reject;
        }

        DialogController.prototype.ok = function ok(output) {
          return this.close(true, output);
        };

        DialogController.prototype.cancel = function cancel(output) {
          return this.close(false, output);
        };

        DialogController.prototype.error = function error(message) {
          var _this = this;

          return invokeLifecycle(this.viewModel, 'deactivate').then(function () {
            return _this.renderer.hideDialog(_this);
          }).then(function () {
            _this.controller.unbind();
            _this._reject(message);
          });
        };

        DialogController.prototype.close = function close(ok, output) {
          var _this2 = this;

          if (this._closePromise) {
            return this._closePromise;
          }

          this._closePromise = invokeLifecycle(this.viewModel, 'canDeactivate', ok).then(function (canDeactivate) {
            if (canDeactivate) {
              return invokeLifecycle(_this2.viewModel, 'deactivate').then(function () {
                return _this2.renderer.hideDialog(_this2);
              }).then(function () {
                _this2.controller.unbind();
                var result = new DialogResult(!ok, output);
                if (!_this2.settings.rejectOnCancel || ok) {
                  _this2._resolve(result);
                } else {
                  _this2._reject(new DialogCancelError(output));
                }
                return { wasCancelled: false };
              });
            }

            _this2._closePromise = undefined;
            if (!_this2.settings.rejectOnCancel) {
              return { wasCancelled: true };
            }
            return Promise.reject(new DialogCancelError());
          }, function (e) {
            _this2._closePromise = undefined;
            return Promise.reject(e);
          });

          return this._closePromise;
        };

        return DialogController;
      }());

      _export('DialogController', DialogController);
    }
  };
});