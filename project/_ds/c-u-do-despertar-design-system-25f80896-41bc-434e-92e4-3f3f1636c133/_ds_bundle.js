/* @ds-bundle: {"format":4,"namespace":"CUDoDespertarDesignSystem_25f808","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"TextField","sourcePath":"components/core/TextField.jsx"},{"name":"AmountDisplay","sourcePath":"components/data/AmountDisplay.jsx"},{"name":"AmountInput","sourcePath":"components/data/AmountInput.jsx"},{"name":"AttachmentCapture","sourcePath":"components/data/AttachmentCapture.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"DefaultField","sourcePath":"components/data/DefaultField.jsx"},{"name":"Receipt","sourcePath":"components/data/Receipt.jsx"},{"name":"RecordRow","sourcePath":"components/data/RecordRow.jsx"},{"name":"StatusBadge","sourcePath":"components/data/StatusBadge.jsx"},{"name":"SuggestionChip","sourcePath":"components/data/SuggestionChip.jsx"},{"name":"ConfirmAction","sourcePath":"components/domain/ConfirmAction.jsx"},{"name":"PendencyCard","sourcePath":"components/domain/PendencyCard.jsx"},{"name":"PeriodLock","sourcePath":"components/domain/PeriodLock.jsx"},{"name":"RegimeVocabulary","sourcePath":"components/domain/RegimeVocabulary.jsx"},{"name":"TwoAxisGuard","sourcePath":"components/domain/TwoAxisGuard.jsx"},{"name":"DomainError","sourcePath":"components/state/DomainError.jsx"},{"name":"EmptyState","sourcePath":"components/state/EmptyState.jsx"},{"name":"InfraError","sourcePath":"components/state/InfraError.jsx"},{"name":"PermissionDenied","sourcePath":"components/state/PermissionDenied.jsx"},{"name":"SkeletonList","sourcePath":"components/state/SkeletonList.jsx"},{"name":"ActionBar","sourcePath":"components/structure/ActionBar.jsx"},{"name":"AppShell","sourcePath":"components/structure/AppShell.jsx"},{"name":"BottomSheet","sourcePath":"components/structure/BottomSheet.jsx"},{"name":"ScreenHeader","sourcePath":"components/structure/ScreenHeader.jsx"},{"name":"WorkQueue","sourcePath":"components/structure/WorkQueue.jsx"},{"name":"WorkQueueItem","sourcePath":"components/structure/WorkQueueItem.jsx"}],"sourceHashes":{"components/core/Button.jsx":"986b07d151d5","components/core/Icon.jsx":"4cdd43d1d68d","components/core/TextField.jsx":"40a3a48779f5","components/data/AmountDisplay.jsx":"13a3c649a7ef","components/data/AmountInput.jsx":"569d973d9569","components/data/AttachmentCapture.jsx":"c71dc482b3de","components/data/DataTable.jsx":"92623f40438b","components/data/DefaultField.jsx":"524ced9c2abe","components/data/Receipt.jsx":"3b2d93692e20","components/data/RecordRow.jsx":"02e33e113d16","components/data/StatusBadge.jsx":"e1d3b21086a9","components/data/SuggestionChip.jsx":"c30e51a0433e","components/domain/ConfirmAction.jsx":"87201283a049","components/domain/PendencyCard.jsx":"fc2ab2648a5a","components/domain/PeriodLock.jsx":"1d9d69b5a95f","components/domain/RegimeVocabulary.jsx":"d6bf2c00bd24","components/domain/TwoAxisGuard.jsx":"594974925882","components/state/DomainError.jsx":"fb5ec23ad615","components/state/EmptyState.jsx":"c938c91f0209","components/state/InfraError.jsx":"2164e14b36aa","components/state/PermissionDenied.jsx":"342f6aef3012","components/state/SkeletonList.jsx":"0bcf40a3b02c","components/structure/ActionBar.jsx":"f7f3c6705528","components/structure/AppShell.jsx":"3f954acd49bc","components/structure/BottomSheet.jsx":"67741292da38","components/structure/ScreenHeader.jsx":"9e480204799a","components/structure/WorkQueue.jsx":"58404b35677b","components/structure/WorkQueueItem.jsx":"803018fd8852","ui_kits/sistema-gestao/AdvanceAuthScreen.jsx":"7a99fda81094","ui_kits/sistema-gestao/Login.jsx":"c45e47e88755","ui_kits/sistema-gestao/MyRecordsScreen.jsx":"7161560e27a9","ui_kits/sistema-gestao/QuickEntryScreen.jsx":"ea0bd5cbafb4","ui_kits/sistema-gestao/ReviewQueueScreen.jsx":"a616a2035335","ui_kits/sistema-gestao/WorkQueueScreen.jsx":"6f76c6c620f8","ui_kits/sistema-gestao/data.js":"68f01bf3a44f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CUDoDespertarDesignSystem_25f808 = window.CUDoDespertarDesignSystem_25f808 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = 'https://unpkg.com/lucide-static@latest/icons/';

/* Lucide, servido do CDN como máscara — permite colorir o glifo com
   qualquer token de cor sem redesenhar o SVG. Ver readme, ICONOGRAPHY. */
function Icon({
  name,
  size = 18,
  color = 'currentColor',
  style,
  ...rest
}) {
  const url = 'url("' + BASE + name + '.svg")';
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    style: {
      display: 'inline-block',
      flex: '0 0 auto',
      width: size,
      height: size,
      background: color,
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  primary: {
    background: 'var(--action-bg)',
    color: 'var(--action-fg)',
    border: '1.5px solid transparent'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-royal)',
    border: '1.5px solid var(--color-royal-border)'
  },
  quiet: {
    background: 'var(--bg-sunken)',
    color: 'var(--text-primary)',
    border: '1px solid var(--color-line)'
  },
  suggest: {
    background: 'var(--color-suggest-soft)',
    color: 'var(--color-suggest)',
    border: '1.5px solid var(--color-suggest-border)'
  },
  onChrome: {
    background: 'rgba(255,255,255,.12)',
    color: '#FFFFFF',
    border: '1.5px solid rgba(255,255,255,.28)'
  }
};
const HOVER = {
  primary: 'var(--action-bg-hover)',
  ghost: 'var(--color-royal-soft)',
  quiet: 'var(--color-line)',
  suggest: 'var(--color-suggest-border)',
  onChrome: 'rgba(255,255,255,.2)'
};
function Button({
  children,
  variant = 'primary',
  density = 'office',
  fullWidth = false,
  iconName,
  iconAfter = false,
  disabled = false,
  blockedReason,
  onClick,
  style,
  ...rest
}) {
  const [hot, setHot] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const field = density === 'field';
  const btn = /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHot(true),
    onMouseLeave: () => setHot(false),
    style: {
      minHeight: field ? 'var(--target-field)' : 'var(--target-office)',
      width: fullWidth ? '100%' : undefined,
      padding: field ? '0 22px' : '0 18px',
      borderRadius: 'var(--radius)',
      font: field ? '700 16.5px var(--font-body)' : '600 15px var(--font-body)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transition: 'background var(--motion-fast), transform var(--motion-fast)',
      transform: hot && !disabled ? 'translateY(-1px)' : 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...v,
      ...(hot && !disabled ? {
        background: HOVER[variant]
      } : null),
      ...(disabled ? {
        background: 'var(--bg-sunken)',
        color: 'var(--color-ink-subtle)',
        border: '1px solid var(--color-line)'
      } : null),
      ...style
    }
  }, rest), iconName && !iconAfter ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconName,
    size: field ? 20 : 18
  }) : null, children, iconName && iconAfter ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconName,
    size: field ? 20 : 18
  }) : null);
  if (!disabled || !blockedReason) return btn;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 7,
      alignItems: fullWidth ? 'stretch' : 'flex-start'
    }
  }, btn, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-small)',
      color: 'var(--color-attention)',
      maxWidth: '46ch'
    }
  }, blockedReason));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TextField({
  label,
  value,
  defaultValue,
  placeholder,
  hint,
  error,
  density = 'office',
  type = 'text',
  multiline = false,
  suffix,
  onChange,
  id,
  readOnly,
  style,
  ...rest
}) {
  const fid = id || 'f-' + String(label || 'campo').replace(/\s+/g, '-').toLowerCase();
  const field = density === 'field';
  const Tag = multiline ? 'textarea' : 'input';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)',
      marginBottom: 7
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Tag, _extends({
    id: fid,
    type: multiline ? undefined : type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    onChange: onChange,
    readOnly: readOnly,
    rows: multiline ? 3 : undefined,
    style: {
      width: '100%',
      minHeight: field ? 'var(--target-field)' : 'var(--target-office)',
      border: '1px solid ' + (error ? 'var(--color-attention)' : 'var(--color-line-strong)'),
      background: readOnly ? 'var(--bg-sunken)' : 'var(--bg-card)',
      borderRadius: 'var(--radius)',
      padding: field ? '12px 14px' : '10px 13px',
      font: field ? 'var(--text-body-lg)' : 'var(--text-body)',
      color: 'var(--text-primary)',
      outline: 'none',
      boxShadow: error ? '0 0 0 3px var(--color-attention-soft)' : 'none',
      paddingRight: suffix ? 64 : undefined,
      resize: 'vertical'
    }
  }, rest)), suffix ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 12,
      font: 'var(--text-amount)',
      color: 'var(--text-meta)',
      pointerEvents: 'none'
    }
  }, suffix) : null), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 7,
      font: 'var(--text-small)',
      color: 'var(--color-attention)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 7,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TextField.jsx", error: String((e && e.message) || e) }); }

// components/data/AmountDisplay.jsx
try { (() => {
const SIZES = {
  sm: {
    font: 'var(--text-amount)'
  },
  md: {
    font: 'var(--text-amount)',
    fontSize: '16.5px'
  },
  lg: {
    font: 'var(--text-amount-lg)'
  },
  hero: {
    font: 'var(--text-amount-hero)',
    letterSpacing: 'var(--tracking-amount)'
  }
};
function br(n) {
  return Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function AmountDisplay({
  value,
  nature = 'neutral',
  size = 'md',
  currency = true,
  style
}) {
  const color = nature === 'despesa' ? 'var(--color-attention)' : nature === 'receita' ? 'var(--color-confirmed)' : 'var(--text-primary)';
  const sign = nature === 'despesa' ? '\u2212\u00a0' : nature === 'receita' ? '+\u00a0' : '';
  return /*#__PURE__*/React.createElement("span", {
    "data-numeric": true,
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 6,
      color,
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      ...SIZES[size],
      ...style
    }
  }, currency ? /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .55,
      fontSize: '.7em'
    }
  }, "R$") : null, /*#__PURE__*/React.createElement("span", null, sign, br(value)));
}
Object.assign(__ds_scope, { AmountDisplay });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/AmountDisplay.jsx", error: String((e && e.message) || e) }); }

// components/data/AmountInput.jsx
try { (() => {
function AmountInput({
  label = 'Quanto foi',
  value = '',
  onChange,
  hint,
  style
}) {
  const [v, setV] = React.useState(value);
  const val = onChange ? value : v;
  const set = x => {
    if (onChange) onChange(x);else setV(x);
  };
  const expr = /[+]/.test(String(val));
  const total = expr ? String(val).split('+').map(n => parseFloat(n.replace(',', '.')) || 0).reduce((a, b) => a + b, 0) : null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-brand)',
      border: '1px solid var(--border-brand)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px 16px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)',
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 24px var(--font-data)',
      color: 'var(--text-meta)'
    }
  }, "R$"), /*#__PURE__*/React.createElement("input", {
    inputMode: "decimal",
    value: val,
    placeholder: "0,00",
    onChange: e => set(e.target.value),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      background: 'transparent',
      outline: 'none',
      font: 'var(--text-amount-hero)',
      letterSpacing: 'var(--tracking-amount)',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--text-primary)',
      padding: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      marginTop: 8,
      background: 'repeating-linear-gradient(to right,var(--color-line-gold) 0 4px,transparent 4px 8px)'
    }
  }), total != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 9,
      font: 'var(--text-small)',
      color: 'var(--color-royal-ink)'
    }
  }, "Soma reconhecida: ", /*#__PURE__*/React.createElement("b", {
    "data-numeric": true,
    style: {
      font: 'var(--text-amount)'
    }
  }, total.toLocaleString('pt-BR', {
    minimumFractionDigits: 2
  })), " \u2014 o valor composto vira pend\xEAncia na confer\xEAncia.") : hint ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 9,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { AmountInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/AmountInput.jsx", error: String((e && e.message) || e) }); }

// components/data/AttachmentCapture.jsx
try { (() => {
function AttachmentCapture({
  label = 'Comprovante',
  filename,
  onCapture,
  onRemove,
  density = 'field',
  style
}) {
  if (filename) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--color-royal-soft)',
        border: '1px solid var(--color-royal-border)',
        borderRadius: 'var(--radius)',
        padding: '10px 10px 10px 14px',
        minHeight: density === 'field' ? 'var(--target-field)' : 'var(--target-office)',
        ...style
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "paperclip",
      size: 17,
      color: "var(--color-royal)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        font: 'var(--text-body-strong)',
        color: 'var(--color-royal-ink)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, filename), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onRemove,
      title: "Remover comprovante",
      style: {
        minWidth: 'var(--tap-min)',
        minHeight: 'var(--tap-min)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-meta)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "x",
      size: 17
    })));
  }
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onCapture,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      textAlign: 'left',
      minHeight: density === 'field' ? 'var(--target-field)' : 'var(--target-office)',
      background: 'var(--bg-card)',
      border: '1px dashed var(--color-line-strong)',
      borderRadius: 'var(--radius)',
      padding: '0 14px',
      cursor: 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "camera",
    size: 20,
    color: "var(--color-royal)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-body-strong)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, "Um toque, direto da c\xE2mera. Nunca obrigat\xF3rio.")));
}
Object.assign(__ds_scope, { AttachmentCapture });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/AttachmentCapture.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function DataTable({
  columns = [],
  rows = [],
  caption,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      background: 'var(--bg-card)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      font: 'var(--text-small)'
    }
  }, caption ? /*#__PURE__*/React.createElement("caption", {
    style: {
      captionSide: 'top',
      textAlign: 'left',
      padding: '11px 13px',
      font: 'var(--text-body-strong)',
      color: 'var(--text-title)'
    }
  }, caption) : null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.numeric ? 'right' : 'left',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)',
      padding: '11px 13px',
      background: 'var(--bg-sunken)',
      borderBottom: '1px solid var(--color-line-strong)',
      whiteSpace: 'nowrap'
    }
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    "data-numeric": c.numeric ? '' : undefined,
    style: {
      padding: '11px 13px',
      borderBottom: i === rows.length - 1 ? 0 : 'var(--border-hairline)',
      verticalAlign: 'top',
      textAlign: c.numeric ? 'right' : 'left',
      font: c.numeric ? 'var(--text-amount)' : 'var(--text-small)',
      fontVariantNumeric: c.numeric ? 'tabular-nums' : undefined,
      color: 'var(--text-primary)',
      whiteSpace: c.numeric ? 'nowrap' : undefined
    }
  }, r[c.key])))))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/DefaultField.jsx
try { (() => {
function DefaultField({
  label,
  value,
  origin,
  onEdit,
  density = 'field',
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onEdit,
    style: {
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      gap: 12,
      textAlign: 'left',
      minHeight: density === 'field' ? 'var(--target-field)' : 'var(--target-office)',
      background: 'var(--bg-card)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius)',
      padding: '9px 13px',
      cursor: 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-body-strong)',
      color: 'var(--text-primary)'
    }
  }, value)), origin ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-small)',
      color: 'var(--text-meta)'
    }
  }, origin) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pencil",
    size: 16,
    color: "var(--color-royal)"
  }));
}
Object.assign(__ds_scope, { DefaultField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DefaultField.jsx", error: String((e && e.message) || e) }); }

// components/data/Receipt.jsx
try { (() => {
function Receipt({
  title = 'Registrado',
  amount,
  lines = [],
  footnote,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border-brand)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 20px 18px',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 4,
      background: 'repeating-linear-gradient(to right,var(--color-confirmed) 0 6px,transparent 6px 12px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--color-confirmed)',
      marginBottom: 8
    }
  }, title), amount != null ? /*#__PURE__*/React.createElement(__ds_scope.AmountDisplay, {
    value: amount,
    size: "hero"
  }) : null, /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: '16px 0 0',
      display: 'grid',
      gap: 7
    }
  }, lines.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.label,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 16,
      borderBottom: '1px solid var(--border-brand)',
      paddingBottom: 6
    }
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, l.label), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      font: 'var(--text-body-strong)',
      color: 'var(--text-primary)',
      textAlign: 'right'
    }
  }, l.value)))), footnote ? /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 14,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, footnote) : null, children);
}
Object.assign(__ds_scope, { Receipt });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Receipt.jsx", error: String((e && e.message) || e) }); }

// components/data/RecordRow.jsx
try { (() => {
const EDGE = {
  pending: 'var(--color-pending)',
  confirmed: 'var(--color-confirmed)',
  reversed: 'var(--color-neutral)'
};
function RecordRow({
  description,
  amount,
  nature = 'despesa',
  meta,
  status = 'pending',
  badges,
  selected = false,
  density = 'field',
  onClick,
  style,
  children
}) {
  const [hot, setHot] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHot(true),
    onMouseLeave: () => setHot(false),
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      background: selected ? 'var(--color-royal-soft)' : 'var(--bg-card)',
      border: '1px solid ' + (selected ? 'var(--color-royal-border)' : 'var(--color-line)'),
      borderRadius: 'var(--radius)',
      padding: density === 'field' ? '13px 15px 13px 17px' : '11px 14px 11px 16px',
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: hot && onClick ? 'var(--shadow-raised)' : 'none',
      transition: 'box-shadow var(--motion-fast), background var(--motion-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 'var(--edge-state)',
      background: EDGE[status] || EDGE.pending
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 15px var(--font-body)',
      color: 'var(--text-primary)'
    }
  }, description), /*#__PURE__*/React.createElement(__ds_scope.AmountDisplay, {
    value: amount,
    nature: nature,
    size: "md"
  })), meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 4,
      font: '500 12px var(--font-data)',
      color: 'var(--text-meta)'
    }
  }, meta) : null, badges ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginTop: 9
    }
  }, badges) : null, children);
}
Object.assign(__ds_scope, { RecordRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/RecordRow.jsx", error: String((e && e.message) || e) }); }

// components/data/StatusBadge.jsx
try { (() => {
const TONES = {
  pending: {
    bg: 'var(--color-pending-soft)',
    fg: 'var(--color-pending)',
    label: 'A conferir'
  },
  confirmed: {
    bg: 'var(--color-confirmed-soft)',
    fg: 'var(--color-confirmed)',
    label: 'Confirmado'
  },
  attention: {
    bg: 'var(--color-attention-soft)',
    fg: 'var(--color-attention)',
    label: 'Aguardando resposta'
  },
  neutral: {
    bg: 'var(--color-neutral-soft)',
    fg: 'var(--color-neutral)',
    label: 'Estornado'
  },
  suggest: {
    bg: 'var(--color-suggest-soft)',
    fg: 'var(--color-suggest)',
    label: 'Sugestão'
  },
  royal: {
    bg: 'var(--color-royal-soft)',
    fg: 'var(--color-royal-ink)',
    label: 'Conciliado'
  }
};
function StatusBadge({
  tone = 'pending',
  children,
  count,
  style
}) {
  const t = TONES[tone] || TONES.pending;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: 'var(--radius-pill)',
      padding: '4px 11px',
      font: '600 12px var(--font-body)',
      background: t.bg,
      color: t.fg,
      whiteSpace: 'nowrap',
      ...style
    }
  }, children || t.label, count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11.5px var(--font-data)',
      opacity: .75
    },
    "data-numeric": true
  }, count) : null);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/SuggestionChip.jsx
try { (() => {
function SuggestionChip({
  children,
  onAccept,
  onDismiss,
  density = 'field',
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--color-suggest-soft)',
      border: '1px dashed var(--color-suggest-border)',
      color: 'var(--color-suggest)',
      borderRadius: 'var(--radius-pill)',
      padding: density === 'field' ? '0 6px 0 14px' : '0 4px 0 12px',
      minHeight: density === 'field' ? 'var(--target-field)' : 'var(--target-office)',
      font: '600 13.5px var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sparkles",
    size: 15
  }), /*#__PURE__*/React.createElement("span", null, children), onAccept ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onAccept,
    title: "Aceitar sugest\xE3o",
    style: {
      minWidth: 'var(--tap-min)',
      minHeight: 'var(--tap-min)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-pill)',
      color: 'var(--color-suggest)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 18
  })) : null, onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDismiss,
    title: "Descartar sugest\xE3o",
    style: {
      minWidth: 'var(--tap-min)',
      minHeight: 'var(--tap-min)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-pill)',
      color: 'var(--text-meta)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  })) : null);
}
Object.assign(__ds_scope, { SuggestionChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SuggestionChip.jsx", error: String((e && e.message) || e) }); }

// components/domain/ConfirmAction.jsx
try { (() => {
/* Doc 2, L2 e L7: diz que é irreversível ANTES, e quando bloqueado
   nomeia a regra em português. */
function ConfirmAction({
  label = 'Confirmar',
  irreversibleNote = 'Confirmar é irreversível. Depois disso, só estorno.',
  blockedBy = [],
  density = 'office',
  onConfirm,
  style
}) {
  const blocked = blockedBy.length > 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      ...style
    }
  }, blocked ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-pending-soft)',
      border: '1px solid var(--color-pending-border)',
      borderLeft: 'var(--edge-state) solid var(--color-pending)',
      borderRadius: '0 var(--radius) var(--radius) 0',
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "triangle-alert",
    size: 16,
    color: "var(--color-pending)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--color-pending)'
    }
  }, blockedBy.length === 1 ? 'Não dá para confirmar: ' + blockedBy[0] : 'Não dá para confirmar ainda')), blockedBy.length > 1 ? /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: 18,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, blockedBy.map(b => /*#__PURE__*/React.createElement("li", {
    key: b
  }, b))) : null) : /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, irreversibleNote), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    density: density,
    fullWidth: density === 'field',
    iconName: "check",
    disabled: blocked,
    onClick: onConfirm,
    blockedReason: blocked ? 'Resolva o que falta acima, ou pergunte a quem registrou.' : undefined
  }, label));
}
Object.assign(__ds_scope, { ConfirmAction });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/ConfirmAction.jsx", error: String((e && e.message) || e) }); }

// components/domain/PendencyCard.jsx
try { (() => {
/* Doc 2, L11. Para o destinatário: caixa de resposta. Para quem
   conferiu: o campo de resposta está AUSENTE, não desabilitado, com a
   razão em texto. */
function PendencyCard({
  question,
  askedBy,
  askedAt,
  answer,
  canAnswer = false,
  onAnswer,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-attention-soft)',
      border: '1px solid var(--color-attention-border)',
      borderLeft: 'var(--edge-state) solid var(--color-attention)',
      borderRadius: '0 var(--radius) var(--radius) 0',
      padding: '14px 16px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      alignItems: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "message-circle-question",
    size: 17,
    color: "var(--color-attention)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--color-attention)'
    }
  }, "Pend\xEAncia aberta")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-body-lg)',
      color: 'var(--text-primary)'
    }
  }, question), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 6,
      font: '500 12px var(--font-data)',
      color: 'var(--text-meta)'
    }
  }, askedBy, askedAt ? ' · ' + askedAt : ''), answer ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: 'var(--bg-card)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)',
      marginBottom: 4
    }
  }, "Resposta"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-primary)'
    }
  }, answer)) : canAnswer ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TextField, {
    label: "Sua resposta",
    multiline: true,
    placeholder: "Foram duas compras no mesmo cupom: 65 de g\xE1s e 70 de extintor."
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    density: "field",
    fullWidth: true,
    iconName: "send",
    onClick: onAnswer
  }, "Responder")) : /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 12,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, "A pergunta \xE9 de quem registrou. Voc\xEA conferiu este lan\xE7amento \u2014 a resposta n\xE3o \xE9 sua para dar."));
}
Object.assign(__ds_scope, { PendencyCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/PendencyCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/PeriodLock.jsx
try { (() => {
function PeriodLock({
  period,
  reason,
  canReopen = false,
  onReopen,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-sunken)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius)',
      padding: '15px 16px',
      display: 'flex',
      gap: 13,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "lock",
    size: 19,
    color: "var(--color-ink-brand)",
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--text-title)'
    }
  }, "Per\xEDodo ", period, " est\xE1 fechado"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 5,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, reason), canReopen ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    iconName: "lock-open",
    onClick: onReopen
  }, "Reabrir per\xEDodo")) : /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 9,
      font: 'var(--text-small)',
      color: 'var(--text-meta)'
    }
  }, "Reabrir exige um administrador, e o motivo fica registrado de forma permanente.")));
}
Object.assign(__ds_scope, { PeriodLock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/PeriodLock.jsx", error: String((e && e.message) || e) }); }

// components/domain/RegimeVocabulary.jsx
try { (() => {
const VOCAB = {
  contribuicao: {
    receita: 'contribuição',
    pessoa: 'participante',
    valor: 'valor sugerido',
    documento: 'recibo de contribuição'
  },
  comercial: {
    receita: 'venda',
    pessoa: 'cliente',
    valor: 'preço',
    documento: 'nota / comprovante de venda'
  }
};
const Ctx = React.createContext(VOCAB.contribuicao);

/* Provedor de contexto. Nenhum outro componente do sistema pode ter
   palavra de negócio escrita dentro. */
function RegimeVocabulary({
  regime = 'contribuicao',
  children,
  style
}) {
  const vocab = VOCAB[regime] || VOCAB.contribuicao;
  return /*#__PURE__*/React.createElement(Ctx.Provider, {
    value: vocab
  }, /*#__PURE__*/React.createElement("div", {
    "data-regime": regime,
    style: style
  }, children));
}
RegimeVocabulary.useTerm = function useTerm(key) {
  return React.useContext(Ctx)[key];
};
Object.assign(__ds_scope, { RegimeVocabulary });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/RegimeVocabulary.jsx", error: String((e && e.message) || e) }); }

// components/domain/TwoAxisGuard.jsx
try { (() => {
/* Doc 3, A1. Estado legítimo e explicado — não é erro de sistema. */
function TwoAxisGuard({
  title = 'Você tem acesso a esta tela, mas não a esta operação',
  explanation,
  requirement,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--color-royal-border)',
      borderTop: 'var(--edge-state) solid var(--color-royal)',
      borderRadius: '0 0 var(--radius) var(--radius)',
      padding: '18px 18px 16px',
      display: 'flex',
      gap: 14,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield-half",
    size: 22,
    color: "var(--color-royal)",
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-title-sm)',
      color: 'var(--text-title)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 7,
      font: 'var(--text-body)',
      color: 'var(--text-secondary)',
      maxWidth: '58ch'
    }
  }, explanation), requirement ? /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 10,
      font: 'var(--text-small)',
      color: 'var(--color-royal-ink)',
      background: 'var(--color-royal-soft)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 11px',
      display: 'inline-block'
    }
  }, requirement) : null));
}
Object.assign(__ds_scope, { TwoAxisGuard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/TwoAxisGuard.jsx", error: String((e && e.message) || e) }); }

// components/state/DomainError.jsx
try { (() => {
function DomainError({
  rule,
  explanation,
  way,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-sunken)',
      border: 'var(--border-hairline)',
      borderLeft: 'var(--edge-state) solid var(--color-ink-brand)',
      borderRadius: '0 var(--radius) var(--radius) 0',
      padding: '14px 16px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--text-primary)'
    }
  }, rule), explanation ? /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 5,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, explanation) : null, way ? /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 8,
      font: 'var(--text-small)',
      color: 'var(--color-royal-ink)'
    }
  }, way) : null);
}
Object.assign(__ds_scope, { DomainError });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/state/DomainError.jsx", error: String((e && e.message) || e) }); }

// components/state/EmptyState.jsx
try { (() => {
/* A flor da vida aparece em três lugares e só: login, estado vazio e
   marca d'água da especificação. Aqui ela é o fundo, a 6% de opacidade. */
function EmptyState({
  title,
  description,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '44px 24px',
      background: 'var(--bg-card)',
      border: '1px dashed var(--color-line-gold)',
      borderRadius: 'var(--radius-lg)',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement(FlowerOfLife, null), /*#__PURE__*/React.createElement("h3", {
    style: {
      position: 'relative',
      font: '700 18px var(--font-display)',
      color: 'var(--text-title)'
    }
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    style: {
      position: 'relative',
      margin: '7px auto 0',
      maxWidth: '34ch',
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, description) : null, action ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginTop: 16
    }
  }, action) : null);
}
function FlowerOfLife() {
  const r = 34;
  const c = [[100, 100], [100, 66], [100, 134], [129, 83], [129, 117], [71, 83], [71, 117]];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 200",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      opacity: .06
    }
  }, /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "var(--color-label)",
    strokeWidth: "1.4"
  }, c.map(([x, y], i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: x,
    cy: y,
    r: r
  }))));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/state/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/state/InfraError.jsx
try { (() => {
function InfraError({
  title = 'Não deu para carregar',
  description,
  onRetry,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-pending-soft)',
      border: '1px solid var(--color-pending-border)',
      borderRadius: 'var(--radius)',
      padding: '15px 16px',
      display: 'flex',
      gap: 13,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "wifi-off",
    size: 19,
    color: "var(--color-pending)",
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--text-primary)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 5,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, description), onRetry ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "quiet",
    iconName: "rotate-cw",
    onClick: onRetry
  }, "Tentar de novo")) : null));
}
Object.assign(__ds_scope, { InfraError });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/state/InfraError.jsx", error: String((e && e.message) || e) }); }

// components/state/PermissionDenied.jsx
try { (() => {
function PermissionDenied({
  screen,
  group,
  missing,
  whoToAsk = 'o administrador',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-attention-soft)',
      border: '1px solid var(--color-attention-border)',
      borderRadius: 'var(--radius)',
      padding: '17px 18px',
      display: 'flex',
      gap: 13,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "ban",
    size: 20,
    color: "var(--color-attention)",
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-title-sm)',
      color: 'var(--text-title)'
    }
  }, "Voc\xEA n\xE3o tem acesso a ", screen), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 7,
      font: 'var(--text-body)',
      color: 'var(--text-secondary)',
      maxWidth: '58ch'
    }
  }, "Seu grupo \xE9 ", /*#__PURE__*/React.createElement("b", null, group), ". Falta a permiss\xE3o ", /*#__PURE__*/React.createElement("code", null, missing), ". Se voc\xEA precisa desse acesso, fale com ", whoToAsk, ".")));
}
Object.assign(__ds_scope, { PermissionDenied });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/state/PermissionDenied.jsx", error: String((e && e.message) || e) }); }

// components/state/SkeletonList.jsx
try { (() => {
function SkeletonList({
  rows = 4,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      ...style
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes cdd-sh{0%{background-position:100% 0}100%{background-position:0 0}}'), Array.from({
    length: rows
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: 'var(--bg-card)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius)',
      padding: '15px 16px'
    }
  }, /*#__PURE__*/React.createElement(Bar, {
    w: ['58%', '44%', '66%', '38%'][i % 4]
  }), /*#__PURE__*/React.createElement(Bar, {
    w: ['32%', '26%', '30%', '22%'][i % 4],
    h: 9,
    top: 10
  }))));
}
function Bar({
  w,
  h = 11,
  top = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: w,
      height: h,
      marginTop: top,
      borderRadius: 'var(--radius-sm)',
      background: 'linear-gradient(90deg,var(--bg-sunken) 25%,#EAE3D3 37%,var(--bg-sunken) 63%)',
      backgroundSize: '400% 100%',
      animation: 'cdd-sh 1.3s ease infinite'
    }
  });
}
Object.assign(__ds_scope, { SkeletonList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/state/SkeletonList.jsx", error: String((e && e.message) || e) }); }

// components/structure/ActionBar.jsx
try { (() => {
function ActionBar({
  children,
  note,
  sticky = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: sticky ? 'sticky' : 'static',
      bottom: 0,
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--color-line)',
      padding: '12px 20px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxShadow: sticky ? '0 -6px 18px -14px rgba(59,38,23,.4)' : 'none',
      ...style
    }
  }, note ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-small)',
      color: 'var(--text-secondary)',
      textAlign: 'center'
    }
  }, note) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, children));
}
Object.assign(__ds_scope, { ActionBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/structure/ActionBar.jsx", error: String((e && e.message) || e) }); }

// components/structure/AppShell.jsx
try { (() => {
/* v3: o rail não é um bloco azul-marinho. É papel esfriado — royal a
   8% — com tinta royal, fio royal de 2px na borda e o item ativo em
   cartão branco. O azul está na estrutura, não numa faixa. */
function AppShell({
  institution = 'Céu do Despertar',
  unit = 'CDD',
  user = {
    name: '',
    group: ''
  },
  nav = [],
  activeId,
  onNavigate,
  density = 'office',
  onUnitClick,
  children,
  style
}) {
  const field = density === 'field';
  return /*#__PURE__*/React.createElement("div", {
    "data-density": density,
    style: {
      display: 'grid',
      gridTemplateColumns: field ? '1fr' : '232px 1fr',
      minHeight: '100%',
      background: 'var(--bg-app)',
      color: 'var(--text-primary)',
      ...style
    }
  }, field ? null : /*#__PURE__*/React.createElement("aside", {
    style: {
      background: 'var(--bg-rail)',
      borderRight: '1px solid var(--color-line-strong)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 18px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 15px/1.05 var(--font-display)',
      letterSpacing: '.01em',
      textTransform: 'uppercase',
      color: 'var(--color-ink-brand)'
    }
  }, "C\xE9u do", /*#__PURE__*/React.createElement("br", null), "Despertar"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 7,
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, "Sistema de gest\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      height: 1,
      background: 'var(--color-line-gold)'
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '0 10px',
      flex: 1
    }
  }, nav.map(item => item.section ? /*#__PURE__*/React.createElement("div", {
    key: item.section,
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-meta)',
      padding: '16px 8px 6px'
    }
  }, item.section) : /*#__PURE__*/React.createElement(NavItem, {
    key: item.id,
    item: item,
    active: item.id === activeId,
    onNavigate: onNavigate
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '12px 10px 0',
      padding: '11px 8px 0',
      borderTop: '1px solid var(--color-line-strong)',
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-sm)',
      flex: '0 0 auto',
      background: 'var(--color-royal)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      font: '700 12px var(--font-data)'
    }
  }, (user.name || '?').slice(0, 2).toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '600 13px var(--font-body)'
    }
  }, user.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, user.group)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: field ? 'var(--bg-rail)' : 'var(--bg-card)',
      borderBottom: '1px solid var(--color-line)',
      borderTop: field ? '2px solid var(--color-royal)' : 0,
      padding: field ? '11px 16px' : '0 20px',
      minHeight: field ? 56 : 52
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, institution), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onUnitClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: '600 13px var(--font-body)',
      padding: '5px 10px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-royal-soft)',
      color: 'var(--color-royal-ink)'
    }
  }, unit, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, field ? user.name : user.group)), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: 'auto'
    }
  }, children), field && nav.length ? /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--color-line)'
    }
  }, nav.filter(n => !n.section).slice(0, 4).map(item => {
    const on = item.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      type: "button",
      onClick: () => onNavigate && onNavigate(item.id),
      style: {
        flex: 1,
        minHeight: 'var(--target-field)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        color: on ? 'var(--color-royal)' : 'var(--text-secondary)',
        borderTop: '2px solid ' + (on ? 'var(--color-royal)' : 'transparent')
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: item.icon || 'circle',
      size: 20
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 10.5px var(--font-body)'
      }
    }, item.label));
  })) : null));
}
function NavItem({
  item,
  active,
  onNavigate
}) {
  const [hot, setHot] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onNavigate && onNavigate(item.id),
    onMouseEnter: () => setHot(true),
    onMouseLeave: () => setHot(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      textAlign: 'left',
      minHeight: 'var(--target-office)',
      padding: '0 10px',
      borderRadius: 'var(--radius-sm)',
      color: active ? 'var(--color-royal-deep)' : 'var(--text-primary)',
      background: active ? 'var(--bg-card)' : hot ? 'rgba(26,61,168,.06)' : 'transparent',
      boxShadow: active ? 'var(--shadow-raised)' : 'none',
      font: active ? '600 13.5px var(--font-body)' : '400 13.5px var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background var(--motion-fast)'
    }
  }, active ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 'var(--edge-state)',
      background: 'var(--color-royal)'
    }
  }) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon || 'circle',
    size: 17,
    color: active ? 'var(--color-royal)' : 'var(--text-meta)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.count ? /*#__PURE__*/React.createElement("span", {
    "data-numeric": true,
    style: {
      font: '600 11.5px var(--font-data)',
      background: 'var(--color-pending-soft)',
      color: 'var(--color-pending)',
      borderRadius: 'var(--radius-pill)',
      padding: '1px 7px'
    }
  }, item.count) : null);
}
Object.assign(__ds_scope, { AppShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/structure/AppShell.jsx", error: String((e && e.message) || e) }); }

// components/structure/BottomSheet.jsx
try { (() => {
function BottomSheet({
  open = true,
  title,
  options = [],
  value,
  onSelect,
  onClose,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(59,38,23,.38)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 40,
      ...style
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      boxShadow: 'var(--shadow-sheet)',
      padding: '8px 0 14px',
      maxHeight: '78%',
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      placeItems: 'center',
      padding: '4px 0 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 4,
      borderRadius: 2,
      background: 'var(--color-line-strong)'
    }
  })), title ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 10px',
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, title) : null, options.map(o => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      onClick: () => onSelect && onSelect(o.value),
      style: {
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        minHeight: 'var(--target-field)',
        padding: '0 20px',
        background: on ? 'var(--color-royal-soft)' : 'transparent',
        borderTop: 'var(--border-hairline)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: 'var(--text-body-lg)',
        color: on ? 'var(--color-royal-ink)' : 'var(--text-primary)'
      }
    }, o.label), o.meta ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: 'var(--text-small)',
        color: 'var(--text-secondary)'
      }
    }, o.meta) : null), on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 19,
      color: "var(--color-royal)"
    }) : null);
  })));
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/structure/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/structure/ScreenHeader.jsx
try { (() => {
function ScreenHeader({
  code,
  title,
  subtitle,
  actions,
  density = 'office',
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--color-line)',
      borderTop: '2px solid var(--color-royal)',
      padding: density === 'field' ? '17px 20px 16px' : '21px 24px 20px',
      display: 'flex',
      gap: 20,
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 240
    }
  }, code ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)',
      marginBottom: 5
    }
  }, code) : null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--text-display)',
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-title)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 7,
      font: 'var(--text-body)',
      color: 'var(--text-secondary)',
      maxWidth: '62ch'
    }
  }, subtitle) : null), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { ScreenHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/structure/ScreenHeader.jsx", error: String((e && e.message) || e) }); }

// components/structure/WorkQueue.jsx
try { (() => {
function WorkQueue({
  children,
  lastCheck,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      ...style
    }
  }, children, lastCheck ? /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 6,
      font: 'var(--text-small)',
      color: 'var(--text-meta)'
    }
  }, "\xDAltima verifica\xE7\xE3o ", lastCheck, ".") : null);
}
Object.assign(__ds_scope, { WorkQueue });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/structure/WorkQueue.jsx", error: String((e && e.message) || e) }); }

// components/structure/WorkQueueItem.jsx
try { (() => {
function WorkQueueItem({
  title,
  subtitle,
  count,
  since,
  tone = 'pending',
  onOpen,
  style
}) {
  const [hot, setHot] = React.useState(false);
  const color = tone === 'attention' ? 'var(--color-attention)' : tone === 'confirmed' ? 'var(--color-confirmed)' : tone === 'royal' ? 'var(--color-royal)' : 'var(--color-pending)';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpen,
    onMouseEnter: () => setHot(true),
    onMouseLeave: () => setHot(false),
    style: {
      display: 'flex',
      width: '100%',
      gap: 14,
      alignItems: 'center',
      textAlign: 'left',
      background: 'var(--bg-card)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius)',
      padding: '13px 14px',
      cursor: 'pointer',
      boxShadow: hot ? 'var(--shadow-raised)' : 'none',
      transition: 'box-shadow var(--motion-fast)',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 'var(--edge-state)',
      background: color
    }
  }), /*#__PURE__*/React.createElement("span", {
    "data-numeric": true,
    style: {
      minWidth: 42,
      height: 42,
      flex: '0 0 auto',
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-sunken)',
      font: '600 18px var(--font-data)',
      color
    }
  }, count), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--text-body-strong)',
      color: 'var(--text-primary)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 2,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, subtitle) : null), since ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px var(--font-data)',
      color: 'var(--text-meta)',
      whiteSpace: 'nowrap'
    }
  }, since) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-right",
    size: 17,
    color: "var(--color-royal)"
  }));
}
Object.assign(__ds_scope, { WorkQueueItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/structure/WorkQueueItem.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema-gestao/AdvanceAuthScreen.jsx
try { (() => {
const {
  RecordRow,
  StatusBadge,
  TwoAxisGuard,
  Button,
  AmountDisplay
} = window.CUDoDespertarDesignSystem_25f808;
function AdvanceAuthScreen({
  hasBond = false,
  onToggleBond
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 18px 28px',
      display: 'grid',
      gap: 14,
      alignContent: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, "F-12 \xB7 Autorizar adiantamento"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--text-display)',
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-title)',
      marginTop: 4
    }
  }, "Autorizar"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 7,
      font: 'var(--text-body)',
      color: 'var(--text-secondary)'
    }
  }, "Quem, quanto, para qu\xEA, comprovante. Nada al\xE9m.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 17px',
      display: 'grid',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-title-sm)',
      color: 'var(--text-title)'
    }
  }, "Patr\xEDcia Zubek"), /*#__PURE__*/React.createElement(AmountDisplay, {
    value: 480,
    size: "lg"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-secondary)'
    }
  }, "Conserto da bomba d\u2019\xE1gua da ch\xE1cara, pago da conta pessoal em 18/08."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "pending"
  }, "Aguardando autoriza\xE7\xE3o"), /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "royal"
  }, "Comprovante anexado"))), hasBond ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    density: "field",
    fullWidth: true,
    iconName: "check"
  }, "Autorizar"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    density: "field",
    fullWidth: true,
    iconName: "x"
  }, "Recusar com motivo")) : /*#__PURE__*/React.createElement(TwoAxisGuard, {
    explanation: "Voc\xEA tem a permiss\xE3o financeiro.adiantamento.autorizar, e por isso esta tela abre para voc\xEA.",
    requirement: "Autorizar exige v\xEDnculo de padrinho ou madrinha. O v\xEDnculo se atribui em P-04, pela governan\xE7a."
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "quiet",
    density: "field",
    fullWidth: true,
    onClick: onToggleBond
  }, hasBond ? 'Ver como administrador sem vínculo' : 'Ver como madrinha'));
}
Object.assign(window, {
  AdvanceAuthScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema-gestao/AdvanceAuthScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema-gestao/Login.jsx
try { (() => {
const {
  Button
} = window.CUDoDespertarDesignSystem_25f808;
function FlowerRule() {
  const c = [[100, 100], [100, 66], [100, 134], [129, 83], [129, 117], [71, 83], [71, 117], [100, 32], [100, 168], [158, 66], [158, 134], [42, 66], [42, 134]];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 200",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: '50%',
      bottom: -190,
      width: 520,
      height: 520,
      transform: 'translateX(-50%)',
      opacity: .14
    }
  }, /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "var(--color-label)",
    strokeWidth: "1"
  }, c.map(([x, y], i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: x,
    cy: y,
    r: 34
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "98"
  })));
}
function LoginScreen({
  onEnter
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100%',
      display: 'grid',
      gridTemplateColumns: '1.05fr .95fr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-brand)',
      borderRight: '1px solid var(--color-line-gold)',
      position: 'relative',
      overflow: 'hidden',
      padding: '46px 48px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement(FlowerRule, null), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-ceu-do-despertar.png",
    alt: "C\xE9u do Despertar \xB7 Desenvolvimento integral do ser humano",
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: 420,
      maxHeight: 300,
      objectFit: 'contain',
      alignSelf: 'center'
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      position: 'relative',
      font: 'var(--text-body)',
      color: 'var(--text-secondary)',
      maxWidth: '44ch',
      alignSelf: 'center',
      textAlign: 'center'
    }
  }, "Um lugar para registrar o que se gasta, conferir o que entrou e fechar o m\xEAs sem reconstruir nada de mem\xF3ria.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      borderTop: '2px solid var(--color-royal)',
      padding: '52px 44px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, "T-01 \xB7 Sistema de gest\xE3o"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--text-display)',
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-title)',
      marginTop: 6
    }
  }, "Entrar"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 9,
      font: 'var(--text-body)',
      color: 'var(--text-secondary)',
      maxWidth: '38ch'
    }
  }, "A autentica\xE7\xE3o acontece no Keycloak. Esta aplica\xE7\xE3o n\xE3o desenha campo de senha.")), /*#__PURE__*/React.createElement(Button, {
    density: "field",
    fullWidth: true,
    iconName: "log-in",
    onClick: onEnter
  }, "Continuar com Keycloak"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-sunken)',
      border: 'var(--border-hairline)',
      borderLeft: 'var(--edge-state) solid var(--color-ink)',
      borderRadius: '0 var(--radius) var(--radius) 0',
      padding: '13px 15px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-strong)'
    }
  }, "Autenticado, mas sem usu\xE1rio ativo?"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 5,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, "Acontece quando algu\xE9m entra no Keycloak antes de o administrador liberar o acesso. A tela explica isso e mostra a quem pedir \u2014 nunca um erro gen\xE9rico."))));
}
Object.assign(window, {
  LoginScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema-gestao/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema-gestao/MyRecordsScreen.jsx
try { (() => {
const {
  RecordRow,
  StatusBadge,
  PendencyCard,
  EmptyState
} = window.CUDoDespertarDesignSystem_25f808;
function MyRecordsScreen() {
  const [open, setOpen] = React.useState('m1');
  const rows = window.CDD_DATA.mine;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 18px 28px',
      display: 'grid',
      gap: 14,
      alignContent: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, "F-02 \xB7 Meus registros"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--text-display)',
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-title)',
      marginTop: 4
    }
  }, "Meus registros"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 7,
      font: 'var(--text-body)',
      color: 'var(--text-secondary)'
    }
  }, "Os fatos que voc\xEA afirmou. Sem total, sem soma, sem filtro por per\xEDodo \u2014 esta tela nunca agrega.")), rows.length ? rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    style: {
      display: 'grid',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(RecordRow, {
    description: r.description,
    amount: r.amount,
    meta: r.meta,
    status: r.status,
    onClick: () => setOpen(open === r.id ? null : r.id),
    badges: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StatusBadge, {
      tone: r.status === 'confirmed' ? 'confirmed' : r.status === 'reversed' ? 'neutral' : 'pending'
    }), r.pendency ? /*#__PURE__*/React.createElement(StatusBadge, {
      tone: "attention"
    }, "Responder \xE0 tesouraria") : null)
  }), r.pendency && open === r.id ? /*#__PURE__*/React.createElement(PendencyCard, {
    canAnswer: true,
    question: r.pendency.question,
    askedBy: r.pendency.askedBy,
    askedAt: r.pendency.askedAt,
    onAnswer: () => setOpen(null)
  }) : null)) : /*#__PURE__*/React.createElement(EmptyState, {
    title: "Voc\xEA ainda n\xE3o registrou nada",
    description: "O primeiro gasto que voc\xEA registrar aparece aqui, com o status da confer\xEAncia."
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-small)',
      color: 'var(--text-meta)',
      marginTop: 4
    }
  }, "Responder a uma pend\xEAncia \xE9 a \xFAnica a\xE7\xE3o de escrita desta tela, e ela n\xE3o altera o status."));
}
Object.assign(window, {
  MyRecordsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema-gestao/MyRecordsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema-gestao/QuickEntryScreen.jsx
try { (() => {
const {
  AmountInput,
  TextField,
  DefaultField,
  AttachmentCapture,
  SuggestionChip,
  ActionBar,
  Button,
  BottomSheet,
  Receipt,
  StatusBadge
} = window.CUDoDespertarDesignSystem_25f808;
function QuickEntryScreen({
  onDone
}) {
  const [valor, setValor] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [conta, setConta] = React.useState('cora');
  const [sheet, setSheet] = React.useState(false);
  const [anexo, setAnexo] = React.useState(null);
  const [comp, setComp] = React.useState('24/08/2026');
  const [done, setDone] = React.useState(false);
  const dateInDesc = /\((\d{2})\/(\d{2})\)/.exec(desc);
  const contaLabel = (window.CDD_DATA.contas.find(c => c.value === conta) || {}).label;
  const total = String(valor).split('+').map(n => parseFloat(n.replace(',', '.')) || 0).reduce((a, b) => a + b, 0);
  if (done) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 18px 28px',
        display: 'grid',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Receipt, {
      amount: total,
      title: "Registrado",
      lines: [{
        label: 'O que foi',
        value: desc || '—'
      }, {
        label: 'Competência',
        value: comp
      }, {
        label: 'Conta',
        value: contaLabel
      }, {
        label: 'Comprovante',
        value: anexo || 'sem anexo'
      }],
      footnote: "Gravado como A conferir. A tesouraria confere e, se faltar algo, devolve a pergunta para voc\xEA."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      density: "field",
      fullWidth: true,
      iconName: "circle-plus",
      onClick: () => {
        setDone(false);
        setValor('');
        setDesc('');
        setAnexo(null);
      }
    }, "Registrar outro")), /*#__PURE__*/React.createElement(Button, {
      variant: "quiet",
      density: "field",
      fullWidth: true,
      onClick: onDone
    }, "Voltar \xE0 fila"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      borderTop: '2px solid var(--color-royal)',
      borderBottom: '1px solid var(--color-line)',
      padding: '15px 18px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, "F-01 \xB7 Lan\xE7amento r\xE1pido"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 22px var(--font-display)',
      letterSpacing: '-.02em',
      marginTop: 4,
      color: 'var(--text-title)'
    }
  }, "Registrar gasto")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '16px 18px 20px',
      display: 'grid',
      gap: 14,
      alignContent: 'start'
    }
  }, /*#__PURE__*/React.createElement(AmountInput, {
    value: valor,
    onChange: setValor,
    hint: "Escreva como voc\xEA fala. Soma vale: 65+70."
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "O que foi",
    density: "field",
    value: desc,
    onChange: e => setDesc(e.target.value),
    placeholder: "mercado cerim\xF4nia m\xE3e divina"
  }), dateInDesc ? /*#__PURE__*/React.createElement(SuggestionChip, {
    onAccept: () => setComp(dateInDesc[1] + '/' + dateInDesc[2] + '/2026'),
    onDismiss: () => {}
  }, "Compet\xEAncia ", dateInDesc[1], "/", dateInDesc[2], " \u2014 vista na descri\xE7\xE3o") : null, /*#__PURE__*/React.createElement(AttachmentCapture, {
    density: "field",
    filename: anexo,
    onCapture: () => setAnexo('IMG_2481.jpg'),
    onRemove: () => setAnexo(null)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '2px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, "Padr\xF5es preenchidos \u2014 toque para trocar"), /*#__PURE__*/React.createElement(DefaultField, {
    label: "Compet\xEAncia",
    value: comp,
    origin: "hoje",
    onEdit: () => {}
  }), /*#__PURE__*/React.createElement(DefaultField, {
    label: "Conta",
    value: contaLabel,
    origin: "mais usada",
    onEdit: () => setSheet(true)
  }), /*#__PURE__*/React.createElement(DefaultField, {
    label: "Unidade",
    value: "CDD",
    origin: "\xFAltimo lan\xE7amento",
    onEdit: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "pending"
  }, "Grava como A conferir"))), /*#__PURE__*/React.createElement(ActionBar, {
    note: "Nada bloqueia o registro. Faltou categoria? Grava e marca pend\xEAncia."
  }, /*#__PURE__*/React.createElement(Button, {
    density: "field",
    fullWidth: true,
    iconName: "check",
    onClick: () => setDone(true)
  }, "Registrar")), /*#__PURE__*/React.createElement(BottomSheet, {
    open: sheet,
    title: "Conta",
    value: conta,
    options: window.CDD_DATA.contas,
    onSelect: v => {
      setConta(v);
      setSheet(false);
    },
    onClose: () => setSheet(false)
  }));
}
Object.assign(window, {
  QuickEntryScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema-gestao/QuickEntryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema-gestao/ReviewQueueScreen.jsx
try { (() => {
const {
  ScreenHeader,
  RecordRow,
  StatusBadge,
  Button,
  ConfirmAction,
  DomainError,
  SkeletonList
} = window.CUDoDespertarDesignSystem_25f808;
function ReviewQueueScreen() {
  const [rows, setRows] = React.useState(window.CDD_DATA.review);
  const [sel, setSel] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const focus = rows.find(r => r.id === (sel.length === 1 ? sel[0] : null));
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.concat(id));
  const confirmar = () => {
    setRows(rs => rs.filter(r => !(sel.includes(r.id) && r.missing.length === 0)));
    setSel([]);
  };
  const blocked = sel.map(id => rows.find(r => r.id === id)).filter(Boolean).flatMap(r => r.missing);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ScreenHeader, {
    code: "F-03 \xB7 Fila de confer\xEAncia",
    title: "Fila de confer\xEAncia",
    subtitle: "Por origem e idade, mais velho primeiro. Cada linha mostra o que falta para poder confirmar.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "quiet",
      iconName: "rotate-cw",
      onClick: () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 1100);
      }
    }, "Recarregar"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      iconName: "check-check",
      onClick: () => setSel(rows.map(r => r.id))
    }, "Selecionar tudo"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 340px',
      gap: 22,
      padding: '22px 24px 40px',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, rows.length, " aguardando confer\xEAncia"), sel.length ? /*#__PURE__*/React.createElement(StatusBadge, {
    tone: "royal",
    count: sel.length
  }, "Selecionados") : null), loading ? /*#__PURE__*/React.createElement(SkeletonList, {
    rows: 4
  }) : rows.map(r => /*#__PURE__*/React.createElement(RecordRow, {
    key: r.id,
    density: "office",
    description: r.description,
    amount: r.amount,
    meta: r.meta,
    status: "pending",
    selected: sel.includes(r.id),
    onClick: () => toggle(r.id),
    badges: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StatusBadge, {
      tone: "pending"
    }), r.missing.map(m => /*#__PURE__*/React.createElement(StatusBadge, {
      key: m,
      tone: "attention"
    }, m)))
  })), !rows.length && !loading ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-secondary)',
      padding: '22px 0'
    }
  }, "Fila zerada. Todo ", /*#__PURE__*/React.createElement("code", null, "A_CONFERIR"), " realmente aguardava confer\xEAncia humana \u2014 o r\xF3tulo nunca mente.") : null), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'sticky',
      top: 0,
      display: 'grid',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 17px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)'
    }
  }, sel.length ? 'Ação em massa' : 'Selecione para conferir'), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 8,
      font: 'var(--text-small)',
      color: 'var(--text-secondary)'
    }
  }, sel.length ? 'Vários lançamentos do mesmo dia e da mesma conta se confirmam juntos — é o caso comum.' : 'Toque nas linhas. O caso comum é confirmar em bloco os lançamentos do mesmo dia.'), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(ConfirmAction, {
    label: sel.length > 1 ? 'Confirmar ' + sel.length + ' lançamentos' : 'Confirmar',
    blockedBy: blocked,
    onConfirm: confirmar
  })), focus && focus.missing.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    fullWidth: true,
    iconName: "message-circle-question"
  }, "Perguntar a quem registrou")) : null), blocked.length ? /*#__PURE__*/React.createElement(DomainError, {
    rule: "N\xE3o d\xE1 para confirmar sem categoria",
    explanation: "Item composto escrito \xE0 m\xE3o (65+70) precisa ser separado antes de virar dois lan\xE7amentos.",
    way: "Devolver com pend\xEAncia mant\xE9m o lan\xE7amento em A conferir e endere\xE7a a pergunta a quem gastou."
  }) : null)));
}
Object.assign(window, {
  ReviewQueueScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema-gestao/ReviewQueueScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema-gestao/WorkQueueScreen.jsx
try { (() => {
const {
  ScreenHeader,
  WorkQueue,
  WorkQueueItem,
  Button,
  EmptyState
} = window.CUDoDespertarDesignSystem_25f808;
function WorkQueueScreen({
  onOpen
}) {
  const [items, setItems] = React.useState(window.CDD_DATA.queue);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ScreenHeader, {
    code: "T-02 \xB7 Fila de trabalho",
    title: "Fila de trabalho",
    subtitle: "A casa de todos os grupos. Lista plana, ordem fixa, e cada linha leva direto \xE0 a\xE7\xE3o.",
    actions: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      iconName: "rotate-cw",
      onClick: () => setItems(window.CDD_DATA.queue)
    }, "Atualizar")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 24px 40px',
      maxWidth: 880
    }
  }, items.length ? /*#__PURE__*/React.createElement(WorkQueue, {
    lastCheck: "hoje, 08:41"
  }, items.map(q => /*#__PURE__*/React.createElement(WorkQueueItem, {
    key: q.id,
    count: q.count,
    title: q.title,
    subtitle: q.subtitle,
    since: q.since,
    tone: q.tone,
    onOpen: () => onOpen(q.go)
  }))) : /*#__PURE__*/React.createElement(EmptyState, {
    title: "Nada aguarda voc\xEA",
    description: "\xDAltima verifica\xE7\xE3o hoje, 08:41. Quando algo precisar da sua aten\xE7\xE3o, aparece aqui.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "quiet",
      onClick: () => setItems(window.CDD_DATA.queue)
    }, "Recarregar")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "quiet",
    iconName: "inbox",
    onClick: () => setItems([])
  }, "Ver o estado vazio"))));
}
Object.assign(window, {
  WorkQueueScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema-gestao/WorkQueueScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sistema-gestao/data.js
try { (() => {
window.CDD_DATA = {
  user: {
    name: 'Aurio Neto',
    group: 'Tesouraria'
  },
  nav: [{
    id: 'T-02',
    label: 'Fila de trabalho',
    icon: 'inbox',
    count: 5
  }, {
    id: 'F-01',
    label: 'Registrar gasto',
    icon: 'circle-plus'
  }, {
    id: 'F-02',
    label: 'Meus registros',
    icon: 'receipt-text'
  }, {
    section: 'Financeiro'
  }, {
    id: 'F-03',
    label: 'Conferência',
    icon: 'check-check',
    count: 7
  }, {
    id: 'F-05',
    label: 'Lançamentos',
    icon: 'list'
  }, {
    id: 'F-07',
    label: 'Contas e fundo',
    icon: 'landmark'
  }, {
    id: 'F-17',
    label: 'Relatórios',
    icon: 'chart-no-axes-column'
  }, {
    id: 'F-22',
    label: 'Fechamento',
    icon: 'lock'
  }],
  queue: [{
    id: 'q1',
    count: 7,
    title: 'Lançamentos a conferir',
    subtitle: 'Manual e extrato · mais velho primeiro',
    since: 'desde 12/08',
    tone: 'pending',
    go: 'F-03'
  }, {
    id: 'q2',
    count: 2,
    title: 'Seus registros com pendência',
    subtitle: 'A conferência devolveu uma pergunta',
    since: 'desde 21/08',
    tone: 'attention',
    go: 'F-02'
  }, {
    id: 'q3',
    count: 1,
    title: 'Período anterior ainda aberto',
    subtitle: '07/2026 · CDD · fechar exige zero A conferir',
    since: 'desde 01/08',
    tone: 'royal',
    go: 'F-22'
  }, {
    id: 'q4',
    count: 3,
    title: 'Adiantamentos aguardando autorização',
    subtitle: 'Governança: padrinho ou madrinha',
    since: 'desde 19/08',
    tone: 'pending',
    go: 'F-12'
  }, {
    id: 'q5',
    count: 4,
    title: 'Linhas de extrato sem lançamento',
    subtitle: 'Cora PJ · saiu dinheiro que ninguém registrou',
    since: 'desde 22/08',
    tone: 'attention',
    go: 'F-26'
  }],
  review: [{
    id: 'r1',
    description: 'mercado cerimônia mãe divina',
    amount: 187.4,
    meta: '24/08/2026 · Cora PJ · alimentação de cerimônia',
    missing: []
  }, {
    id: 'r2',
    description: '65+70 recarga extintor e suporte',
    amount: 135,
    meta: '24/08/2026 · Espécie · sem categoria',
    missing: ['falta categoria', 'valor composto não separado']
  }, {
    id: 'r3',
    description: 'ração cavalos (23/02)',
    amount: 220,
    meta: '23/02/2026 · Nubank Paty · animais',
    missing: []
  }, {
    id: 'r4',
    description: 'gasolina ida ao mercado',
    amount: 96.5,
    meta: '22/08/2026 · Espécie · transporte',
    missing: []
  }, {
    id: 'r5',
    description: 'pix jardineiro',
    amount: 300,
    meta: '21/08/2026 · Cora PJ · sem unidade',
    missing: ['falta unidade']
  }, {
    id: 'r6',
    description: 'compra de velas',
    amount: 74.9,
    meta: '20/08/2026 · Cora PJ · cerimônia',
    missing: []
  }, {
    id: 'r7',
    description: 'conserto da bomba d’água',
    amount: 480,
    meta: '18/08/2026 · Nubank Paty · manutenção',
    missing: []
  }],
  mine: [{
    id: 'm1',
    description: '65+70 recarga extintor e suporte',
    amount: 135,
    status: 'pending',
    meta: '24/08/2026 · Espécie',
    pendency: {
      question: 'Os 65 e os 70 são duas compras? Qual categoria de cada uma?',
      askedBy: 'Tesouraria',
      askedAt: '25/08 09:12'
    }
  }, {
    id: 'm2',
    description: 'mercado cerimônia mãe divina',
    amount: 187.4,
    status: 'pending',
    meta: '24/08/2026 · Cora PJ'
  }, {
    id: 'm3',
    description: 'ração cavalos (23/02)',
    amount: 220,
    status: 'confirmed',
    meta: '23/02/2026 · Nubank Paty'
  }, {
    id: 'm4',
    description: 'gasolina — lançamento duplicado',
    amount: 96.5,
    status: 'reversed',
    meta: '19/08/2026 · Espécie'
  }],
  contas: [{
    value: 'cora',
    label: 'Cora PJ',
    meta: 'mais usada por você'
  }, {
    value: 'nubank',
    label: 'Nubank Paty',
    meta: 'conta pessoal'
  }, {
    value: 'especie',
    label: 'Espécie',
    meta: 'caixa da chácara'
  }, {
    value: 'itau',
    label: 'Itaú Munay',
    meta: 'unidade comercial'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sistema-gestao/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.AmountDisplay = __ds_scope.AmountDisplay;

__ds_ns.AmountInput = __ds_scope.AmountInput;

__ds_ns.AttachmentCapture = __ds_scope.AttachmentCapture;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.DefaultField = __ds_scope.DefaultField;

__ds_ns.Receipt = __ds_scope.Receipt;

__ds_ns.RecordRow = __ds_scope.RecordRow;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.SuggestionChip = __ds_scope.SuggestionChip;

__ds_ns.ConfirmAction = __ds_scope.ConfirmAction;

__ds_ns.PendencyCard = __ds_scope.PendencyCard;

__ds_ns.PeriodLock = __ds_scope.PeriodLock;

__ds_ns.RegimeVocabulary = __ds_scope.RegimeVocabulary;

__ds_ns.TwoAxisGuard = __ds_scope.TwoAxisGuard;

__ds_ns.DomainError = __ds_scope.DomainError;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.InfraError = __ds_scope.InfraError;

__ds_ns.PermissionDenied = __ds_scope.PermissionDenied;

__ds_ns.SkeletonList = __ds_scope.SkeletonList;

__ds_ns.ActionBar = __ds_scope.ActionBar;

__ds_ns.AppShell = __ds_scope.AppShell;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.ScreenHeader = __ds_scope.ScreenHeader;

__ds_ns.WorkQueue = __ds_scope.WorkQueue;

__ds_ns.WorkQueueItem = __ds_scope.WorkQueueItem;

})();
