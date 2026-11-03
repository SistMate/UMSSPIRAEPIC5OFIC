import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class VacancyAffinityDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  affinityPercentage?: number | null;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

export class OrderVacanciesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyAffinityDto)
  vacancies!: VacancyAffinityDto[];
}