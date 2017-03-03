'use strict';

System.register(['aurelia-metadata', 'aurelia-dependency-injection', 'aurelia-templating', './dialog-controller', './renderer', './lifecycle', './dialog-options', './dialog-cancel-error', './interfaces'], function (_export, _context) {
  "use strict";

  var Origin, Container, CompositionEngine, ViewSlot, DialogController, Renderer, invokeLifecycle, dialogOptions, DialogCancelError, DialogSettings, OpenDialogResult, CloseDialogResult, _class, _temp, DialogService;

  

  function _createSettings(settings) {
    settings = Object.assign({}, dialogOptions, settings);
    settings.startingZIndex = dialogOptions.startingZIndex;
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
      viewSlot: new ViewSlot(host, true),
      host: host
    };

    if (typeof compositionContext.viewModel === 'function') {
      compositionContext.viewModel = Origin.get(compositionContext.viewModel).moduleId;
    }

    if (typeof compositionContext.viewModel === 'string') {
      return compositionEngine.ensureViewModel(compositionContext);
    }

    return Promise.resolve(compositionContext);
  }

  function _tryActivate(service, dialogController, compositionContext) {
    return invokeLifecycle(dialogController.viewModel, 'canActivate', dialogController.settings.model).then(function (canActivate) {
      if (canActivate) {
        return _composeAndShowDialog(service, dialogController, compositionContext);
      }

      if (dialogController.settings.rejectOnCancel) {
        throw new DialogCancelError();
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
        invokeLifecycle(dialogController.viewModel, 'deactivate');
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
  return {
    setters: [function (_aureliaMetadata) {
      Origin = _aureliaMetadata.Origin;
    }, function (_aureliaDependencyInjection) {
      Container = _aureliaDependencyInjection.Container;
    }, function (_aureliaTemplating) {
      CompositionEngine = _aureliaTemplating.CompositionEngine;
      ViewSlot = _aureliaTemplating.ViewSlot;
    }, function (_dialogController) {
      DialogController = _dialogController.DialogController;
    }, function (_renderer) {
      Renderer = _renderer.Renderer;
    }, function (_lifecycle) {
      invokeLifecycle = _lifecycle.invokeLifecycle;
    }, function (_dialogOptions) {
      dialogOptions = _dialogOptions.dialogOptions;
    }, function (_dialogCancelError) {
      DialogCancelError = _dialogCancelError.DialogCancelError;
    }, function (_interfaces) {
      DialogSettings = _interfaces.DialogSettings;
      OpenDialogResult = _interfaces.OpenDialogResult;
      CloseDialogResult = _interfaces.CloseDialogResult;
    }],
    execute: function () {
      _export('DialogService', DialogService = (_temp = _class = function () {
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
            dialogController = new DialogController(childContainer.get(Renderer), _createSettings(settings), resolve, reject);
          });
          childContainer.registerInstance(DialogController, dialogController);

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
      }(), _class.inject = [Container, CompositionEngine], _temp));

      _export('DialogService', DialogService);
    }
  };
});