/// <reference path="./extended.d.ts" />
// see https://github.com/import-js/eslint-plugin-import/issues/2288
// eslint-disable-next-line import/no-deprecated
import { createTheme, PaletteMode, ThemeOptions, useMediaQuery } from '@mui/material'
import * as Changes from './changes'
import * as Components from './component-changes'
import { merge } from 'lodash-unified'
import type { PaletteOptions } from '@mui/material/styles/createPalette'
import { DarkColor, LightColor, Color } from './constants'
import tinyColor from 'tinycolor2'

export const parseColor = tinyColor

const color = (mode: PaletteMode, color: Color): PaletteOptions => ({
    mode,
    primary: { main: color.primary, contrastText: color.primaryContrastText },
    secondary: { main: color.primary, contrastText: color.primaryContrastText }, // Yes, not a typo, it's primary
    background: { paper: color.primaryBackground, default: color.secondaryBackground },
    error: { main: color.redMain, contrastText: color.redContrastText },
    success: { main: color.greenMain },
    warning: { main: color.orangeMain },
    divider: color.divider,
    text: { primary: color.textPrimary, secondary: color.textSecondary },
})

function MaskTheme(mode: PaletteMode) {
    const colors = mode === 'dark' ? DarkColor : LightColor
    const theme = merge(
        { palette: color(mode, colors) } as ThemeOptions,
        ...Object.values(Changes).map(applyColors),
        ...Object.values(Components).map(applyColors),
    )
    return createTheme(theme)
    function applyColors(x: any) {
        if (typeof x === 'function') return x(mode, colors)
        return x
    }
}
export const MaskLightTheme = MaskTheme('light')
export const MaskDarkTheme = MaskTheme('dark')
export * from './makeStyles'
export * from './Components'
export * from './hooks'
export * from './ShadowRoot'
export * from './UIHelper/custom-ui-helper'
export { getMaskColor, useMaskColor, MaskColorVar, applyMaskColorVars } from './constants'

const query = '(prefers-color-scheme: dark)'
export function useSystemPreferencePalette(): PaletteMode {
    // see https://github.com/import-js/eslint-plugin-import/issues/2288
    // eslint-disable-next-line import/no-deprecated
    return useMediaQuery(query) ? 'dark' : 'light'
}
export function currentSystemPreferencePalette(): PaletteMode {
    return matchMedia(query).matches ? 'dark' : 'light'
}

export enum Appearance {
    default = 'default',
    light = 'light',
    dark = 'dark',
}
