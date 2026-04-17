'use client';

import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/**
 * Hook ket hop Zod schema voi React Hook Form
 * Error messages tu Zod schema (tieng Viet)
 */
export function useFormValidation<
  TInput extends FieldValues,
  TOutput = TInput,
>(
  schema: z.ZodType<TOutput, TInput>,
  defaultValues?: DefaultValues<TInput>,
) {
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema) as unknown as Resolver<
      TInput,
      unknown,
      TOutput
    >,
    defaultValues,
    mode: 'onBlur',
  });

  return {
    register: form.register,
    handleSubmit: form.handleSubmit,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    reset: form.reset,
    setValue: form.setValue,
    getValues: form.getValues,
    watch: form.watch,
    trigger: form.trigger,
    control: form.control,
    setError: (name: Path<TInput>, message: string) =>
      form.setError(name, { type: 'manual', message }),
    clearErrors: form.clearErrors,
    formState: form.formState,
  };
}
