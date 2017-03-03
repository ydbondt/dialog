var _class, _temp;

import { Origin } from 'aurelia-metadata';
import { Container } from 'aurelia-dependency-injection';
import { CompositionEngine, ViewSlot } from 'aurelia-templating';
import { DialogController } from './dialog-controller';
import { Renderer } from './renderer';
import { invokeLifecycle } from './lifecycle';
import { dialogOptions } from './dialog-options';
import { DialogCancelError } from './dialog-cancel-error';
import { DialogSettings, OpenDialogResult, CloseDialogResult } from './interfaces';

export let DialogService = (_temp = _class = class DialogService {

  constructor(container, compositionEngine) {
    this.container = container;
    this.compositionEngine = compositionEngine;
    this.controllers = [];
    this.hasActiveDialog = this.hasOpenDialog = false;
  }

  open(settings) {
    let childContainer = this.container.createChild();
    let dialogController;
    let closeResult = new Promise((resolve, reject) => {
      dialogController = new DialogController(childContainer.get(Renderer), _createSettings(settings), resolve, reject);
    });
    childContainer.registerInstance(DialogController, dialogController);

    closeResult.then(() => {
      _removeController(this, dialogController);
    }, () => {
      _removeController(this, dialogController);
    });

    let openResult = _getViewModel(this.container, this.compositionEngine, childContainer, dialogController).then(compositionContext => {
      dialogController.viewModel = compositionContext.viewModel;
      dialogController.slot = compositionContext.viewSlot;
      return _tryActivate(this, dialogController, compositionContext).then(result => {
        if (result) {
          return result;
        }
        return {
          wasCancelled: false,
          controller: dialogController,
          closeResult
        };
      });
    });

    return settings.yieldController ? openResult : openResult.then(result => result.wasCancelled ? result : result.closeResult);
  }

  closeAll() {
    return Promise.all(this.controllers.slice(0).map(controller => {
      if (!controller.settings.rejectOnCancel) {
        return controller.cancel().then(result => {
          if (result.wasCancelled) {
            return controller;
          }
        });
      }
      return controller.cancel().then(() => {}).catch(reason => {
        if (reason.wasCancelled) {
          return controller;
        }
        return Promise.reject(reason);
      });
    })).then(unclosedControllers => unclosedControllers.filter(unclosed => !!unclosed));
  }
}, _class.inject = [Container, CompositionEngine], _temp);

function _createSettings(settings) {
  settings = Object.assign({}, dialogOptions, settings);
  settings.startingZIndex = dialogOptions.startingZIndex;
  return settings;
}

function _getViewModel(container, compositionEngine, childContainer, dialogController) {
  let host = dialogController.renderer.getDialogContainer();
  let compositionContext = {
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
  return invokeLifecycle(dialogController.viewModel, 'canActivate', dialogController.settings.model).then(canActivate => {
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
  return service.compositionEngine.compose(compositionContext).then(controller => {
    dialogController.controller = controller;
    dialogController.view = controller.view;
    return dialogController.renderer.showDialog(dialogController).then(() => {
      service.controllers.push(dialogController);
      service.hasActiveDialog = service.hasOpenDialog = !!service.controllers.length;
    }).catch(reason => {
      invokeLifecycle(dialogController.viewModel, 'deactivate');
      return Promise.reject(reason);
    });
  });
}

function _removeController(service, dialogCOntroller) {
  let i = service.controllers.indexOf(dialogCOntroller);
  if (i !== -1) {
    service.controllers.splice(i, 1);
    service.hasActiveDialog = service.hasOpenDialog = !!service.controllers.length;
  }
}