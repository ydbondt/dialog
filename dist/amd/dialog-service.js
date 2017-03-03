define(['exports', 'aurelia-metadata', 'aurelia-dependency-injection', 'aurelia-templating', './dialog-controller', './renderer', './lifecycle', './dialog-options', './dialog-cancel-error', './interfaces'], function (exports, _aureliaMetadata, _aureliaDependencyInjection, _aureliaTemplating, _dialogController, _renderer, _lifecycle, _dialogOptions, _dialogCancelError, _interfaces) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DialogService = undefined;

  

  var _class, _temp;

  var DialogService = exports.DialogService = (_temp = _class = function () {
    function DialogService(container, compositionEngine) {
      

      this.container = container;
      this.compositionEngine = compositionEngine;
      this.controllers = [];
      this.hasActiveDialog = this.hasOpenDialog = false;
    }

    DialogService.prototype.open = function open(settings) {
      var _this = this;

      var childContainer = this.container.createChild();
      var dialogController = void 0;
      var closeResult = new Promise(function (resolve, reject) {
        dialogController = new _dialogController.DialogController(childContainer.get(_renderer.Renderer), _createSettings(settings), resolve, reject);
      });
      childContainer.registerInstance(_dialogController.DialogController, dialogController);

      closeResult.then(function () {
        _removeController(_this, dialogController);
      }, function () {
        _removeController(_this, dialogController);
      });

      var openResult = _getViewModel(this.container, this.compositionEngine, childContainer, dialogController).then(function (compositionContext) {
        dialogController.viewModel = compositionContext.viewModel;
        dialogController.slot = compositionContext.viewSlot;
        return _tryActivate(_this, dialogController, compositionContext).then(function (result) {
          if (result) {
            return result;
          }
          return {
            wasCancelled: false,
            controller: dialogController,
            closeResult: closeResult
          };
        });
      });

      return settings.yieldController ? openResult : openResult.then(function (result) {
        return result.wasCancelled ? result : result.closeResult;
      });
    };

    DialogService.prototype.closeAll = function closeAll() {
      return Promise.all(this.controllers.slice(0).map(function (controller) {
        if (!controller.settings.rejectOnCancel) {
          return controller.cancel().then(function (result) {
            if (result.wasCancelled) {
              return controller;
            }
          });
        }
        return controller.cancel().then(function () {}).catch(function (reason) {
          if (reason.wasCancelled) {
            return controller;
          }
          return Promise.reject(reason);
        });
      })).then(function (unclosedControllers) {
        return unclosedControllers.filter(function (unclosed) {
          return !!unclosed;
        });
      });
    };

    return DialogService;
  }(), _class.inject = [_aureliaDependencyInjection.Container, _aureliaTemplating.CompositionEngine], _temp);


  function _createSettings(settings) {
    settings = Object.assign({}, _dialogOptions.dialogOptions, settings);
    settings.startingZIndex = _dialogOptions.dialogOptions.startingZIndex;
    return settings;
  }

  function _getViewModel(container, compositionEngine, childContainer, dialogController) {
    var host = dialogController.renderer.getDialogContainer();
    var compositionContext = {
      container: container,
      childContainer: childContainer,
      model: dialogController.settings.model,
      view: dialogController.settings.view,
      viewModel: dialogController.settings.viewModel,
      viewSlot: new _aureliaTemplating.ViewSlot(host, true),
      host: host
    };

    if (typeof compositionContext.viewModel === 'function') {
      compositionContext.viewModel = _aureliaMetadata.Origin.get(compositionContext.viewModel).moduleId;
    }

    if (typeof compositionContext.viewModel === 'string') {
      return compositionEngine.ensureViewModel(compositionContext);
    }

    return Promise.resolve(compositionContext);
  }

  function _tryActivate(service, dialogController, compositionContext) {
    return (0, _lifecycle.invokeLifecycle)(dialogController.viewModel, 'canActivate', dialogController.settings.model).then(function (canActivate) {
      if (canActivate) {
        return _composeAndShowDialog(service, dialogController, compositionContext);
      }

      if (dialogController.settings.rejectOnCancel) {
        throw new _dialogCancelError.DialogCancelError();
      }

      return {
        wasCancelled: true
      };
    });
  }

  function _composeAndShowDialog(service, dialogController, compositionContext) {
    return service.compositionEngine.compose(compositionContext).then(function (controller) {
      dialogController.controller = controller;
      dialogController.view = controller.view;
      return dialogController.renderer.showDialog(dialogController).then(function () {
        service.controllers.push(dialogController);
        service.hasActiveDialog = service.hasOpenDialog = !!service.controllers.length;
      }).catch(function (reason) {
        (0, _lifecycle.invokeLifecycle)(dialogController.viewModel, 'deactivate');
        return Promise.reject(reason);
      });
    });
  }

  function _removeController(service, dialogCOntroller) {
    var i = service.controllers.indexOf(dialogCOntroller);
    if (i !== -1) {
      service.controllers.splice(i, 1);
      service.hasActiveDialog = service.hasOpenDialog = !!service.controllers.length;
    }
  }
});