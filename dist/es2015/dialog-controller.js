import { invokeLifecycle } from './lifecycle';
import { DialogResult } from './dialog-result';
import { DialogCancelError } from './dialog-cancel-error';

export let DialogController = class DialogController {
  constructor(renderer, settings, resolve, reject) {
    this.renderer = renderer;
    this.settings = settings;
    this._resolve = resolve;
    this._reject = reject;
  }

  ok(output) {
    return this.close(true, output);
  }

  cancel(output) {
    return this.close(false, output);
  }

  error(message) {
    return invokeLifecycle(this.viewModel, 'deactivate').then(() => {
      return this.renderer.hideDialog(this);
    }).then(() => {
      this.controller.unbind();
      this._reject(message);
    });
  }

  close(ok, output) {
    if (this._closePromise) {
      return this._closePromise;
    }

    this._closePromise = invokeLifecycle(this.viewModel, 'canDeactivate', ok).then(canDeactivate => {
      if (canDeactivate) {
        return invokeLifecycle(this.viewModel, 'deactivate').then(() => {
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
};