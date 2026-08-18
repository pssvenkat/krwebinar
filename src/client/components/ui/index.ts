/**
 * Design System — Barrel Export
 *
 * Import all UI components from this single entry point:
 * import { Button, Input, Card, ... } from '@client/components/ui'
 */

export { Button } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'

export { Input } from './Input'
export type { InputProps } from './Input'

export { Select } from './Select'
export type { SelectProps, SelectOption } from './Select'

export { Textarea } from './Textarea'
export type { TextareaProps } from './Textarea'

export { Checkbox, Radio, RadioGroup } from './Checkbox'
export type { CheckboxProps, RadioProps, RadioGroupProps } from './Checkbox'

export { PhoneInput } from './PhoneInput'
export type { PhoneInputProps } from './PhoneInput'

export { CountrySelect } from './CountrySelect'
export type { CountrySelectProps, CountryOption } from './CountrySelect'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card'
export type { CardProps, CardVariant } from './Card'

export { Badge, WebinarStatusBadge } from './Badge'
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge'

export { Modal } from './Modal'
export type { ModalProps } from './Modal'

export { Drawer } from './Drawer'
export type { DrawerProps } from './Drawer'

export { Tabs, TabList, Tab, TabPanel } from './Tabs'
export type { TabsProps, TabListProps, TabProps, TabPanelProps } from './Tabs'

export { Table } from './Table'
export type { TableProps, Column } from './Table'

export { Pagination } from './Pagination'
export type { PaginationProps } from './Pagination'

export { ToastProvider, useToast } from './Toast'
export type { ToastItem, ToastVariant } from './Toast'

export { Alert } from './Alert'
export type { AlertProps, AlertVariant } from './Alert'

export { Dropdown } from './Dropdown'
export type { DropdownProps, DropdownItem } from './Dropdown'

export { Avatar } from './Avatar'
export type { AvatarProps, AvatarSize } from './Avatar'

export { EmptyState, LoadingState, ErrorState } from './States'
export type { EmptyStateProps, LoadingStateProps, ErrorStateProps } from './States'

export { StarRating } from './StarRating'
export type { StarRatingProps } from './StarRating'

export { Progress } from './Progress'
export type { ProgressProps, ProgressVariant } from './Progress'

export { ThemePreview } from './ThemePreview'
