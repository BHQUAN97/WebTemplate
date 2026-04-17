'use client';

import * as React from 'react';
import {
  FormProvider,
  SubmitHandler,
  useForm,
  UseFormProps,
  UseFormReturn,
  FieldValues,
  DefaultValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

export interface ValidatedFormProps<TSchema extends ZodType>
  extends Omit<
    React.FormHTMLAttributes<HTMLFormElement>,
    'onSubmit' | 'defaultValue' | 'children'
  > {
  /** Zod schema dung de validate */
  schema: TSchema;
  /** Default values cho form */
  defaultValues?: DefaultValues<TSchema['_output'] & FieldValues>;
  /** Handler khi submit thanh cong */
  onSubmit: SubmitHandler<TSchema['_output'] & FieldValues>;
  /**
   * Children — co the la ReactNode hoac render prop nhan form methods.
   */
  children:
    | React.ReactNode
    | ((
        methods: UseFormReturn<TSchema['_output'] & FieldValues>,
      ) => React.ReactNode);
  /** Mode validate — mac dinh 'onBlur' */
  mode?: UseFormProps['mode'];
  /** Option forward them cho useForm */
  formOptions?: Omit<
    UseFormProps<TSchema['_output'] & FieldValues>,
    'resolver' | 'defaultValues' | 'mode'
  >;
}

/**
 * ValidatedForm — wrapper form tu dong:
 * - Gan zodResolver(schema)
 * - Provide FormContext cho children (useFormContext / Controller)
 * - Auto-focus vao field error dau tien khi submit fail
 * - Default mode = 'onBlur'
 */
export function ValidatedForm<TSchema extends ZodType>({
  schema,
  defaultValues,
  onSubmit,
  children,
  mode = 'onBlur',
  formOptions,
  ...formProps
}: ValidatedFormProps<TSchema>) {
  type Values = TSchema['_output'] & FieldValues;

  const methods = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
    mode,
    shouldFocusError: true,
    ...formOptions,
  });

  const handleInvalid = React.useCallback(
    (errors: Record<string, unknown>) => {
      // Auto-focus vao field error dau tien (khi shouldFocusError khong giai quyet duoc)
      const firstKey = Object.keys(errors)[0];
      if (!firstKey) return;
      const el =
        (document.querySelector(
          `[name="${firstKey}"]`,
        ) as HTMLElement | null) ??
        (document.getElementById(`field-${firstKey}`) as HTMLElement | null);
      if (el && typeof el.focus === 'function') {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [],
  );

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        onSubmit={methods.handleSubmit(onSubmit, handleInvalid)}
        {...formProps}
      >
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </FormProvider>
  );
}
