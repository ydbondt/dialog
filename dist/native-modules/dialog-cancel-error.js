

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

export var DialogCancelError = function (_Error) {
  _inherits(DialogCancelError, _Error);

  function DialogCancelError() {
    var cancellationReason = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

    

    var _this = _possibleConstructorReturn(this, _Error.call(this, 'Operation cancelled.'));

    _this.wasCancelled = true;

    _this.reason = cancellationReason;
    return _this;
  }

  return DialogCancelError;
}(Error);