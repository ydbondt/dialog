import {DOM} from 'aurelia-pal';
import {transient,Container} from 'aurelia-dependency-injection';
import {customAttribute,customElement,inlineView,bindable,CompositionEngine,ViewSlot} from 'aurelia-templating';
import {Origin} from 'aurelia-metadata';

const containerTagName = 'ai-dialog-container';
const overlayTagName = 'ai-dialog-overlay';
export const transitionEvent = (function() {
  let transition = null;

  return function() {
    if (transition) return transition;

    let t;
    let el = DOM.createElement('fakeelement');
    let transitions = {
      'transition': 'transitionend',
      'OTransition': 'oTransitionEnd',
      'MozTransition': 'transitionend',
      'WebkitTransition': 'webkitTransitionEnd'
    };
    for (t in transitions) {
      if (el.style[t] !== undefined) {
        transition = transitions[t];
        return transition;
      }
    }
  };
}());
export const hasTransition = (function() {
  const unprefixedName = 'transitionDuration';
  const el = DOM.createElement('fakeelement');
  const prefixedNames = ['webkitTransitionDuration', 'oTransitionDuration'];
  let transitionDurationName;
  if (unprefixedName in el.style) {
    transitionDurationName = unprefixedName;
  } else {
    transitionDurationName = prefixedNames.find(prefixed => (prefixed in el.style));
  }
  return function(element) {
    return !!transitionDurationName && !!DOM.getComputedStyle(element)[transitionDurationName]
      .split(',')
      .find(duration => !!parseFloat(duration));
  };
}());

@transient()
export class DialogRenderer {
  _escapeKeyEventHandler = (e) => {
    if (e.keyCode === 27) {
      let top = this._dialogControllers[this._dialogControllers.length - 1];
      if (top && (top.settings.lock !== true || top.settings.enableEscClose === true)) {
        top.cancel();
      }
    }
  }

  getDialogContainer() {
    return DOM.createElement('div');
  }

  showDialog(dialogController: DialogController) {
    let settings = dialogController.settings;
    let body = DOM.querySelectorAll('body')[0];
    let wrapper = document.createElement('div');

    this.modalOverlay = DOM.createElement(overlayTagName);
    this.modalContainer = DOM.createElement(containerTagName);
    this.anchor = dialogController.slot.anchor;
    wrapper.appendChild(this.anchor);
    this.modalContainer.appendChild(wrapper);

    this.stopPropagation = (e) => { e._aureliaDialogHostClicked = true; };
    this.closeModalClick = (e) => {
      if (!settings.lock && !e._aureliaDialogHostClicked) {
        dialogController.cancel();
      } else {
        return false;
      }
    };

    dialogController.centerDialog = () => {
      if (settings.centerHorizontalOnly) return;
      centerDialog(this.modalContainer);
    };

    this.modalOverlay.style.zIndex = settings.startingZIndex;
    this.modalContainer.style.zIndex = settings.startingZIndex;

    let lastContainer = Array.from(body.querySelectorAll(containerTagName)).pop();

    if (lastContainer) {
      lastContainer.parentNode.insertBefore(this.modalContainer, lastContainer.nextSibling);
      lastContainer.parentNode.insertBefore(this.modalOverlay, lastContainer.nextSibling);
    } else {
      body.insertBefore(this.modalContainer, body.firstChild);
      body.insertBefore(this.modalOverlay, body.firstChild);
    }

    if (!this._dialogControllers.length) {
      DOM.addEventListener('keyup', this._escapeKeyEventHandler);
    }

    this._dialogControllers.push(dialogController);

    dialogController.slot.attached();

    if (typeof settings.position === 'function') {
      settings.position(this.modalContainer, this.modalOverlay);
    } else {
      dialogController.centerDialog();
    }

    this.modalContainer.addEventListener('click', this.closeModalClick);
    this.anchor.addEventListener('click', this.stopPropagation);

    return new Promise((resolve) => {
      let renderer = this;
      if (settings.ignoreTransitions || !hasTransition(this.modalContainer)) {
        resolve();
      } else {
        this.modalContainer.addEventListener(transitionEvent(), onTransitionEnd);
      }

      this.modalOverlay.classList.add('active');
      this.modalContainer.classList.add('active');
      body.classList.add('ai-dialog-open');

      function onTransitionEnd(e) {
        if (e.target !== renderer.modalContainer) {
          return;
        }
        renderer.modalContainer.removeEventListener(transitionEvent(), onTransitionEnd);
        resolve();
      }
    });
  }

  hideDialog(dialogController: DialogController) {
    let settings = dialogController.settings;
    let body = DOM.querySelectorAll('body')[0];

    this.modalContainer.removeEventListener('click', this.closeModalClick);
    this.anchor.removeEventListener('click', this.stopPropagation);

    let i = this._dialogControllers.indexOf(dialogController);
    if (i !== -1) {
      this._dialogControllers.splice(i, 1);
    }

    if (!this._dialogControllers.length) {
      DOM.removeEventListener('keyup', this._escapeKeyEventHandler);
    }

    return new Promise((resolve) => {
      let renderer = this;
      if (settings.ignoreTransitions || !hasTransition(this.modalContainer)) {
        resolve();
      } else {
        this.modalContainer.addEventListener(transitionEvent(), onTransitionEnd);
      }

      this.modalOverlay.classList.remove('active');
      this.modalContainer.classList.remove('active');

      function onTransitionEnd() {
        renderer.modalContainer.removeEventListener(transitionEvent(), onTransitionEnd);
        resolve();
      }
    })
      .then(() => {
        body.removeChild(this.modalOverlay);
        body.removeChild(this.modalContainer);
        dialogController.slot.detached();

        if (!this._dialogControllers.length) {
          body.classList.remove('ai-dialog-open');
        }

        return Promise.resolve();
      });
  }
}

DialogRenderer.prototype._dialogControllers = []; // will be shared by all instances

function centerDialog(modalContainer) {
  const child = modalContainer.children[0];
  const vh = Math.max(DOM.querySelectorAll('html')[0].clientHeight, window.innerHeight || 0);

  child.style.marginTop = Math.max((vh - child.offsetHeight) / 2, 30) + 'px';
  child.style.marginBottom = Math.max((vh - child.offsetHeight) / 2, 30) + 'px';
}

/**
 * An abstract base class for implementors of the basic Renderer API.
 */
export class Renderer {
  /**
   * Gets an anchor for the ViewSlot to insert a view into.
   * @returns A DOM element.
   */
  getDialogContainer(): any {
    throw new Error('DialogRenderer must implement getDialogContainer().');
  }

  /**
   * Displays the dialog.
   * @returns Promise A promise that resolves when the dialog has been displayed.
   */
  showDialog(dialogController: DialogController): Promise<any> {
    throw new Error('DialogRenderer must implement showDialog().');
  }

  /**
   * Hides the dialog.
   * @returns Promise A promise that resolves when the dialog has been hidden.
   */
  hideDialog(dialogController: DialogController): Promise<any> {
    throw new Error('DialogRenderer must implement hideDialog().');
  }
}

/**
 * Call a lifecycle method on a viewModel if it exists.
 * @function
 * @param instance The viewModel instance.
 * @param name The lifecycle method name.
 * @param model The model to pass to the lifecycle method.
 * @returns Promise The result of the lifecycle method.
 */
export function invokeLifecycle(instance: any, name: string, model: any) {
  if (typeof instance[name] === 'function') {
    return Promise.resolve().then(() => {
      return instance[name](model);
    }).then(function(result) {
      if (result !== null && result !== undefined) {
        return result;
      }

      return true;
    });
  }

  return Promise.resolve(true);
}

@customAttribute('attach-focus')
export class AttachFocus {
  static inject = [Element];

  value = true;

  constructor(element) {
    this.element = element;
  }

  attached() {
    if (this.value && this.value !== 'false') {
      this.element.focus();
    }
  }

  valueChanged(newValue) {
    this.value = newValue;
  }
}

@customElement('ai-dialog')
@inlineView(`
  <template>
    <slot></slot>
  </template>
`)
export class AiDialog {

}

@customElement('ai-dialog-body')
@inlineView(`
  <template>
    <slot></slot>
  </template>
`)
export class AiDialogBody {

}

export class DialogCancelError extends Error {
  wasCancelled = true;
  reason: any;

  constructor(cancellationReason: any = null) {
    super('Operation cancelled.');
    this.reason = cancellationReason;
  }
}

/**
 * The result of a dialog open operation.
 */
export class DialogResult {
  /**
   * Indicates whether or not the dialog was cancelled.
   */
  wasCancelled: boolean = false;

  /**
   * The data returned from the dialog.
   */
  output: any;

  /**
   * Creates an instance of DialogResult (Used Internally)
   */
  constructor(cancelled: boolean, output: any) {
    this.wasCancelled = cancelled;
    this.output = output;
  }
}

export let dialogOptions = {
  lock: true,
  centerHorizontalOnly: false,
  startingZIndex: 1000,
  ignoreTransitions: false,
  rejectOnCancel: false,
  yieldController: false,
  enableEscClose: false
};

interface DialogSettings {
  viewModel: any;
  view?: any;
  model?: any;
  lock?: boolean;
  startingZIndex?: number;
  centerHorizontalOnly?: boolean;
  rejectOnCancel?: boolean;
  yieldController?: boolean;
  ignoreTransitions?: boolean;
  position?: (modalContainer: Element, modalOverlay: Element) => void;
}

interface CloseDialogResult {
  wasCancelled: boolean;
  output?: any;
}

interface OpenDialogResult {
  wasCancelled: boolean;
  controller?: DialogController;
  closeResult?: Promise<CloseDialogResult>;
}

/**
 * A controller object for a Dialog instance.
 */
export class DialogController {
  /**
   * The settings used by this controller.
   */
  settings: any;

  /**
   * Creates an instance of DialogController.
   */
  constructor(renderer: DialogRenderer, settings: any, resolve: Function, reject: Function) {
    this.renderer = renderer;
    this.settings = settings;
    this._resolve = resolve;
    this._reject = reject;
  }

  /**
   * Closes the dialog with a successful output.
   * @param output The returned success output.
   */
  ok(output?: any): Promise<DialogResult> {
    return this.close(true, output);
  }

  /**
   * Closes the dialog with a cancel output.
   * @param output The returned cancel output.
   */
  cancel(output?: any): Promise<DialogResult> {
    return this.close(false, output);
  }

  /**
   * Closes the dialog with an error result.
   * @param message An error message.
   * @returns Promise An empty promise object.
   */
  error(message: any): Promise<void> {
    return invokeLifecycle(this.viewModel, 'deactivate')
      .then(() => {
        return this.renderer.hideDialog(this);
      }).then(() => {
        this.controller.unbind();
        this._reject(message);
      });
  }

  /**
   * Closes the dialog.
   * @param ok Whether or not the user input signified success.
   * @param output The specified output.
   * @returns Promise An empty promise object.
   */
  close(ok: boolean, output?: any): Promise<DialogResult> {
    if (this._closePromise) {
      return this._closePromise;
    }

    this._closePromise = invokeLifecycle(this.viewModel, 'canDeactivate', ok).then(canDeactivate => {
      if (canDeactivate) {
        return invokeLifecycle(this.viewModel, 'deactivate')
          .then(() => {
            return this.renderer.hideDialog(this);
          }).then(() => {
            this.controller.unbind();
            let result = new DialogResult(!ok, output);
            if (!this.settings.rejectOnCancel || ok) {
              this._resolve(result);
            } else {
              this._reject(new DialogCancelError(output));
            }
            return { wasCancelled: false };
          });
      }

      this._closePromise = undefined;
      if (!this.settings.rejectOnCancel) {
        return { wasCancelled: true };
      }
      return Promise.reject(new DialogCancelError());
    }, e => {
      this._closePromise = undefined;
      return Promise.reject(e);
    });

    return this._closePromise;
  }
}

let defaultRenderer = DialogRenderer;

let resources = {
  'ai-dialog': './ai-dialog',
  'ai-dialog-header': './ai-dialog-header',
  'ai-dialog-body': './ai-dialog-body',
  'ai-dialog-footer': './ai-dialog-footer',
  'attach-focus': './attach-focus'
};

let defaultCSSText = `ai-dialog-container,ai-dialog-overlay{position:fixed;top:0;right:0;bottom:0;left:0}ai-dialog-overlay{opacity:0}ai-dialog-overlay.active{opacity:1}ai-dialog-container{display:block;transition:opacity .2s linear;opacity:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch}ai-dialog-container.active{opacity:1}ai-dialog-container>div{padding:30px}ai-dialog-container>div>div{display:block;min-width:300px;width:-moz-fit-content;width:-webkit-fit-content;width:fit-content;height:-moz-fit-content;height:-webkit-fit-content;height:fit-content;margin:auto}ai-dialog-container,ai-dialog-container>div,ai-dialog-container>div>div{outline:0}ai-dialog{display:table;box-shadow:0 5px 15px rgba(0,0,0,.5);border:1px solid rgba(0,0,0,.2);border-radius:5px;padding:3;min-width:300px;width:-moz-fit-content;width:-webkit-fit-content;width:fit-content;height:-moz-fit-content;height:-webkit-fit-content;height:fit-content;margin:auto;border-image-source:initial;border-image-slice:initial;border-image-width:initial;border-image-outset:initial;border-image-repeat:initial;background:#fff}ai-dialog>ai-dialog-header{display:block;padding:16px;border-bottom:1px solid #e5e5e5}ai-dialog>ai-dialog-header>button{float:right;border:none;display:block;width:32px;height:32px;background:0 0;font-size:22px;line-height:16px;margin:-14px -16px 0 0;padding:0;cursor:pointer}ai-dialog>ai-dialog-body{display:block;padding:16px}ai-dialog>ai-dialog-footer{display:block;padding:6px;border-top:1px solid #e5e5e5;text-align:right}ai-dialog>ai-dialog-footer button{color:#333;background-color:#fff;padding:6px 12px;font-size:14px;text-align:center;white-space:nowrap;vertical-align:middle;-ms-touch-action:manipulation;touch-action:manipulation;cursor:pointer;background-image:none;border:1px solid #ccc;border-radius:4px;margin:5px 0 5px 5px}ai-dialog>ai-dialog-footer button:disabled{cursor:default;opacity:.45}ai-dialog>ai-dialog-footer button:hover:enabled{color:#333;background-color:#e6e6e6;border-color:#adadad}.ai-dialog-open{overflow:hidden}`;
/**
 * A configuration builder for the dialog plugin.
 */
export class DialogConfiguration {
  /**
   * The configuration settings.
   */
  settings: any;

  constructor(aurelia) {
    this.aurelia = aurelia;
    this.settings = dialogOptions;
    this.resources = [];
    this.cssText = defaultCSSText;
    this.renderer = defaultRenderer;
  }

  /**
   * Selects the Aurelia conventional defaults for the dialog plugin.
   * @return This instance.
   */
  useDefaults(): DialogConfiguration {
    return this.useRenderer(defaultRenderer)
      .useCSS(defaultCSSText)
      .useStandardResources();
  }

  /**
   * Exports the standard set of dialog behaviors to Aurelia's global resources.
   * @return This instance.
   */
  useStandardResources(): DialogConfiguration {
    return this.useResource('ai-dialog')
      .useResource('ai-dialog-header')
      .useResource('ai-dialog-body')
      .useResource('ai-dialog-footer')
      .useResource('attach-focus');
  }

  /**
   * Exports the chosen dialog element or view to Aurelia's global resources.
   * @param resourceName The name of the dialog resource to export.
   * @return This instance.
   */
  useResource(resourceName: string): DialogConfiguration {
    this.resources.push(resourceName);
    return this;
  }

  /**
   * Configures the plugin to use a specific dialog renderer.
   * @param renderer A type that implements the Renderer interface.
   * @param settings Global settings for the renderer.
   * @return This instance.
   */
  useRenderer(renderer: Function, settings?: Object): DialogConfiguration {
    this.renderer = renderer;
    this.settings = Object.assign(this.settings, settings || {});
    return this;
  }

  /**
   * Configures the plugin to use specific css.
   * @param cssText The css to use in place of the default styles.
   * @return This instance.
   */
  useCSS(cssText: string): DialogConfiguration {
    this.cssText = cssText;
    return this;
  }

  _apply() {
    this.aurelia.transient(Renderer, this.renderer);
    this.resources.forEach(resourceName => this.aurelia.globalResources(resources[resourceName]));

    if (this.cssText) {
      DOM.injectStyles(this.cssText);
    }
  }
}

/**
 * * View-model for footer of Dialog.
 * */
@customElement('ai-dialog-footer')
@inlineView(`
  <template>
    <slot></slot>

    <template if.bind="buttons.length > 0">
      <button type="button" class="btn btn-default" repeat.for="button of buttons" click.trigger="close(button)">\${button}</button>
    </template>
  </template>
`)
export class AiDialogFooter {
  static inject = [DialogController];

  @bindable buttons: any[] = [];
  @bindable useDefaultButtons: boolean = false;

  constructor(controller: DialogController) {
    this.controller = controller;
  }

  close(buttonValue: string) {
    if (AiDialogFooter.isCancelButton(buttonValue)) {
      this.controller.cancel(buttonValue);
    } else {
      this.controller.ok(buttonValue);
    }
  }

  useDefaultButtonsChanged(newValue: boolean) {
    if (newValue) {
      this.buttons = ['Cancel', 'Ok'];
    }
  }

  static isCancelButton(value: string) {
    return value === 'Cancel';
  }
}

@customElement('ai-dialog-header')
@inlineView(`
  <template>
    <button type="button" class="dialog-close" aria-label="Close" if.bind="!controller.settings.lock" click.trigger="controller.cancel()">
      <span aria-hidden="true">&times;</span>
    </button>

    <div class="dialog-header-content">
      <slot></slot>
    </div>
  </template>
`)
export class AiDialogHeader {
  static inject = [DialogController];

  constructor(controller) {
    this.controller = controller;
  }
}

/**
 * A service allowing for the creation of dialogs.
 */
export class DialogService {
  static inject = [Container, CompositionEngine];

  /**
   * The current dialog controllers
   */
  controllers: DialogController[];
  /**
   * Is there an open dialog
   */
  hasOpenDialog: boolean;
  hasActiveDialog: boolean;

  constructor(container: Container, compositionEngine: CompositionEngine) {
    this.container = container;
    this.compositionEngine = compositionEngine;
    this.controllers = [];
    this.hasActiveDialog = this.hasOpenDialog = false;
  }

  /**
   * Opens a new dialog.
   * @param settings Dialog settings for this dialog instance.
   * @return Promise A promise that settles when the dialog is closed.
   */
  open(settings?: DialogSettings): Promise<OpenDialogResult | CloseDialogResult> {
    let childContainer = this.container.createChild();
    let dialogController;
    let closeResult: Promise<CloseDialogResult> = new Promise((resolve, reject) => {
      dialogController = new DialogController(childContainer.get(Renderer), _createSettings(settings), resolve, reject);
    });
    childContainer.registerInstance(DialogController, dialogController);

    closeResult.then(() => {
      _removeController(this, dialogController);
    }, () => {
      _removeController(this, dialogController);
    });

    let openResult = _getViewModel(this.container, this.compositionEngine, childContainer, dialogController).then((compositionContext) => {
      dialogController.viewModel = compositionContext.viewModel;
      dialogController.slot = compositionContext.viewSlot;
      return _tryActivate(this, dialogController, compositionContext).then((result) => {
        if (result) { return result; }
        return {
          wasCancelled: false,
          controller: dialogController,
          closeResult
        };
      });
    });

    return settings.yieldController ? openResult : openResult.then(result => result.wasCancelled ? result : result.closeResult);
  }

  /**
   * Closes all open dialogs at the time of invocation.
   * @return Promise<DialogController[]> All controllers whose close operation was cancelled.
   */
  closeAll(): Promise<DialogController[]> {
    return Promise.all(this.controllers.slice(0).map((controller) => {
      if (!controller.settings.rejectOnCancel) {
        return controller.cancel().then((result) => {
          if (result.wasCancelled) {
            return controller;
          }
        });
      }
      return controller.cancel().then(() => { }).catch((reason) => {
        if (reason.wasCancelled) {
          return controller;
        }
        return Promise.reject(reason);
      });
    })).then((unclosedControllers) => unclosedControllers.filter(unclosed => !!unclosed));
  }
}

function _createSettings(settings) {
  settings = Object.assign({}, dialogOptions, settings);
  settings.startingZIndex = dialogOptions.startingZIndex; // should be set only when configuring the plugin
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
  return invokeLifecycle(dialogController.viewModel, 'canActivate', dialogController.settings.model)
    .then((canActivate) => {
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
    }).catch((reason) => {
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
